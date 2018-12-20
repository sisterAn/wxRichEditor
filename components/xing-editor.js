// components/xing-editor.js
const recorderManager = wx.getRecorderManager()
const innerAudioContext = wx.createInnerAudioContext()
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    //图片上传相关属性，参考wx.uploadFile
    imageUploadUrl: String,
    imageUploadName: String,
    imageUploadHeader: Object,
    imageUploadFormData: Object,
    imageUploadKeyChain: String, //例：'image.url'

    //是否在选择图片后立即上传
    // uploadImageWhenChoose: {
    //   type: Boolean,
    //   value: false,
    // },

    //输入内容
    nodes: Array,
    html: String,

    //内容输出格式，参考rich-text组件，默认为节点列表
    outputType: {
      type: String,
      value: 'html',
    },

    buttonBackgroundColor: {
      type: String,
      value: '#409EFF',
    },

    buttonTextColor: {
      type: String,
      value: '#fff',
    },
  },

  /**
   * 组件的初始数据
   */
  data: {
    windowHeight: 0,
    nodeList: [],
    textBufferPool: [],
  },

  attached: function () {
    const { windowHeight } = wx.getSystemInfoSync();
    this.setData({
      windowHeight,
    })
    if (this.properties.nodes && this.properties.nodes.length > 0) {
      const textBufferPool = [];
      this.properties.nodes.forEach((node, index) => {
        if (node.name === 'p') {
          textBufferPool[index] = node.children[0].text;
        }
      })
      this.setData({
        textBufferPool,
        nodeList: this.properties.nodes,
      })
    } else if (this.properties.html) {
      const nodeList = this.HTMLtoNodeList();
      const textBufferPool = [];
      nodeList.forEach((node, index) => {
        if (node.name === 'p') {
          textBufferPool[index] = node.children[0].text;
        }
      })
      this.setData({
        textBufferPool,
        nodeList,
      })
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 事件：添加文本
     */
    addText: function (e) {
      this.writeTextToNode();
      const index = e.currentTarget.dataset.index;
      const node = {
        name: 'p',
        attrs: {
          class: 'xing-p',
        },
        children: [{
          type: 'text',
          text: ''
        }]
      }
      const nodeList = this.data.nodeList;
      const textBufferPool = this.data.textBufferPool;
      nodeList.splice(index + 1, 0, node);
      textBufferPool.splice(index + 1, 0, '');
      this.setData({
        nodeList,
        textBufferPool,
      })
    },

    /**
     * 事件：添加语音
     */
    addAudio: function (e) {
      this.writeTextToNode();
      const index = e.currentTarget.dataset.index;
      const node = {
        name: 'audio',
        attrs: {
          class: 'xing-audio',
          src: '../img/audio.png',
          path: '',
          _uploaded: false,
        }
      }
      const nodeList = this.data.nodeList;
      const textBufferPool = this.data.textBufferPool;
      nodeList.splice(index + 1, 0, node);
      textBufferPool.splice(index + 1, 0, '');
      this.setData({
        nodeList,
        textBufferPool,
      })
    },

    /**
     * 事件：添加图片
     */
    addImage: function (e) {
      this.writeTextToNode();
      const index = e.currentTarget.dataset.index;
      wx.chooseImage({
        count: 1,
        success: res => {
          const tempFilePath = res.tempFilePaths[0];
          wx.getImageInfo({
            src: tempFilePath,
            success: res => {
              const node = {
                name: 'img',
                attrs: {
                  class: 'xing-img',
                  style: 'width: 100%',
                  src: tempFilePath,
                  // Todo: 图片是否已经上传
                  _uploaded: true,
                  _height: res.height / res.width,
                },
              }
              let nodeList = this.data.nodeList;
              let textBufferPool = this.data.textBufferPool;
              nodeList.splice(index + 1, 0, node);
              textBufferPool.splice(index + 1, 0, tempFilePath);
              this.setData({
                nodeList,
                textBufferPool,
              })
            }
          })
        },
      })
    },

    /**
     * 事件：添加图片组
     */
    addImages: function (e) {
      this.writeTextToNode();
      const index = e.currentTarget.dataset.index;
      wx.chooseImage({
        success: res => {
          const tempFilePath = res.tempFilePaths;
          let nodeList = this.data.nodeList;
          let textBufferPool = this.data.textBufferPool;
          let imagesSrc
          for (let i=0;i<tempFilePath.length; i++) {
            imagesSrc += tempFilePath[i] + (i > 0 ? ";": "")
          }
          textBufferPool.splice(index + 1, 0, imagesSrc);
          if (parseInt(index) === -1) {
            const node = {
              name: 'imgs',
              attrs: {
                src: tempFilePath,
                // Todo: 图片是否已经上传
                _uploaded: true,
              }
            }
            nodeList.splice(index + 1, 0, node);
          } else {
            nodeList[index].attrs.src = nodeList[index].attrs.src.concat(tempFilePath)
          }
          console.log('nodeList: ', nodeList)
          this.setData({
            nodeList,
            textBufferPool,
          })
        },
      })
    },

    /**
     * 添加视频
     */
    addVideo: function(e) {
      this.writeTextToNode();
      const index = e.currentTarget.dataset.index;
      let that = this
      wx.chooseVideo({
        sourceType: ['album', 'camera'],
        maxDuration: 60,
        camera: ['front', 'back'],
        success: function (res) {
          const {tempFilePath} = res
          const node = {
            name: 'video',
            attrs: {
              class: 'xing-video',
              style: 'width: 100%',
              src: tempFilePath,
              // Todo: 图片是否已经上传
              _uploaded: true
            },
          }
          let nodeList = that.data.nodeList;
          let textBufferPool = that.data.textBufferPool;
          nodeList.splice(index + 1, 0, node);
          textBufferPool.splice(index + 1, 0, tempFilePath);
          
          that.setData({
            nodeList,
            textBufferPool,
          })
        }
      })
    },

    /**
     * 事件：删除节点
     */
    deleteNode: function (e) {
      this.writeTextToNode();
      const index = e.currentTarget.dataset.index;
      let nodeList = this.data.nodeList;
      let textBufferPool = this.data.textBufferPool;
      nodeList.splice(index, 1);
      textBufferPool.splice(index, 1);
      this.setData({
        nodeList,
        textBufferPool,
      })
    },

    /**
     * 事件：上移
     */
    upNode: function (e) {
      this.writeTextToNode();
      const index = e.currentTarget.dataset.index;
      let nodeList = this.data.nodeList;
      this.swapArray(nodeList, index, index - 1);
      let textBufferPool = this.data.textBufferPool;
      this.swapArray(textBufferPool, index, index - 1);
      this.setData({
        nodeList,
        textBufferPool,
      })
    },

    /**
     * 事件：下移
     */
    downNode: function (e) {
      this.writeTextToNode();
      const index = e.currentTarget.dataset.index;
      let nodeList = this.data.nodeList;
      this.swapArray(nodeList, index, index + 1);
      let textBufferPool = this.data.textBufferPool;
      this.swapArray(textBufferPool, index, index + 1);
      this.setData({
        nodeList,
        textBufferPool,
      })
    },

    swapArray(arr, index1, index2) {
      arr[index1] = arr.splice(index2, 1, arr[index1])[0]
      return arr
    },

    /**
     * 事件：文本输入
     */
    onTextareaInput: function (e) {
      const index = e.currentTarget.dataset.index;
      let textBufferPool = this.data.textBufferPool;
      textBufferPool[index] = e.detail.value;
      this.setData({
        textBufferPool,
      })
    },

    /**
     * 事件：提交内容
     */
    onFinish: function (e) {
      console.log('nodeList: ', this.data.nodeList)
      console.log('textBufferPool: ', this.data.textBufferPool)
      wx.showLoading({
        title: '正在保存',
      })
      this.writeTextToNode();
      this.handleOutput();
    },

    /**
     * 开始录音
     */
    startAudio: function (e) {
      const index = e.currentTarget.dataset.index;
      let nodeList = this.data.nodeList;
      nodeList[index].attrs.src = '../img/audio_selected.png'
      this.setData({
        nodeList,
      })
      const options = {
        duration: 10000,//指定录音的时长，单位 ms
        sampleRate: 16000,//采样率
        numberOfChannels: 1,//录音通道数
        encodeBitRate: 96000,//编码码率
        format: 'mp3',//音频格式，有效值 aac/mp3
        frameSize: 50,//指定帧大小，单位 KB
      }
      //开始录音
      recorderManager.start(options);
      recorderManager.onStart(() => {
        console.log('recorder start')
      });
      //错误回调
      recorderManager.onError((res) => {
        console.log(res);
      })
    },

    /**
     * 结束录音
     */
    stopAudio: function(e) {
      const index = e.currentTarget.dataset.index;
      let nodeList = this.data.nodeList;
      let textBufferPool = this.data.textBufferPool;
      nodeList[index].attrs.src = '../img/audio.png'
      
      recorderManager.stop();
      recorderManager.onStop((res) => {
        const { tempFilePath } = res
        console.log('停止录音', tempFilePath)
        nodeList[index].attrs.path = tempFilePath
        nodeList[index].attrs._uploaded = true
        nodeList[index].attrs.src = ''
        textBufferPool[index] = tempFilePath;

        this.setData({
          nodeList,
          textBufferPool
        })
        // setTimeout(function () {
        //   var urls = app.globalData.urls + "/Web/UpVoice";
        //   console.log(s.data.recodePath);
        //   wx.uploadFile({
        //     url: urls,
        //     filePath: s.data.recodePath,
        //     name: 'file',
        //     header: {
        //       'content-type': 'multipart/form-data'
        //     },
        //     success: function (res) {
        //       var str = res.data;
        //       var data = JSON.parse(str);
        //       if (data.states == 1) {
        //         var cEditData = s.data.editData;
        //         cEditData.recodeIdentity = data.identitys;
        //         s.setData({ editData: cEditData });
        //       } else {
        //         wx.showModal({
        //           title: '提示',
        //           content: data.message,
        //           showCancel: false,
        //           success: function (res) {
        //           }
        //         });
        //       }
        //       wx.hideToast();
        //     },
        //     fail: function (res) {
        //       console.log(res);
        //       wx.showModal({
        //         title: '提示',
        //         content: "网络请求失败，请确保网络是否正常",
        //         showCancel: false,
        //         success: function (res) { }
        //       });
        //       wx.hideToast();
        //     }
        //   });
        // }, 0) 
      })
    },

    /**
     * 播放声音
     */
    playAudio: function (e) {
      const index = e.currentTarget.dataset.index;
      let nodeList = this.data.nodeList;
      innerAudioContext.autoplay = true
      innerAudioContext.src = nodeList[index].attrs.path,
        innerAudioContext.onPlay(() => {
          console.log('开始播放')
        })
      innerAudioContext.onError((res) => {
        console.log(res.errMsg)
        console.log(res.errCode)
      })
    },

    /**
     * 预览图片
     */
    previewImg: function(e) {
      let index = e.currentTarget.dataset.index
      let curentUrl = e.currentTarget.dataset.url
      let nodeList = this.data.nodeList;
      wx.previewImage({
        current: curentUrl, // 当前显示图片的http链接
        urls: nodeList[index].attrs.src // 需要预览的图片http链接列表
      })
    },

    /**
     * 方法：HTML转义
     */
    htmlEncode: function (str) {
      var s = "";
      if (str.length == 0) return "";
      s = str.replace(/&/g, "&gt;");
      s = s.replace(/</g, "&lt;");
      s = s.replace(/>/g, "&gt;");
      s = s.replace(/ /g, "&nbsp;");
      s = s.replace(/\'/g, "&#39;");
      s = s.replace(/\"/g, "&quot;");
      s = s.replace(/\n/g, "<br>");
      return s;
    },

    /**
     * 方法：HTML转义
     */
    htmlDecode: function (str) {
      var s = "";
      if(str.length == 0) return "";
      s = str.replace(/&gt;/g, "&");
      s = s.replace(/&lt;/g, "<");
      s = s.replace(/&gt;/g, ">");
      s = s.replace(/&nbsp;/g, " ");
      s = s.replace(/&#39;/g, "\'");
      s = s.replace(/&quot;/g, "\"");
      s = s.replace(/<br>/g, "\n");
      return s;
    },

    /**
     * 方法：将缓冲池的文本写入节点
     */
    writeTextToNode: function (e) {
      const textBufferPool = this.data.textBufferPool;
      const nodeList = this.data.nodeList;
      nodeList.forEach((node, index) => {
        if (node.name === 'p') {
          node.children[0].text = textBufferPool[index];
        }
      })
      this.setData({
        nodeList,
      })
    },

    /**
     * 方法：将HTML转为节点
     */
    HTMLtoNodeList: function () {
      let html = this.properties.html;
      let htmlNodeList = [];
      while (html.length > 0) {
        const endTag = html.match(/<\/[a-z0-9]+>/);
        if (!endTag) break;
        const htmlNode = html.substring(0, endTag.index + endTag[0].length);
        htmlNodeList.push(htmlNode);
        html = html.substring(endTag.index + endTag[0].length);
      }
      return htmlNodeList.map(htmlNode => {
        let node = {attrs: {}};
        const startTag = htmlNode.match(/<[^<>]+>/);
        const startTagStr = startTag[0].substring(1, startTag[0].length - 1).trim();
        node.name = startTagStr.split(/\s+/)[0];
        startTagStr.match(/[^\s]+="[^"]+"/g).forEach(attr => {
          const [name, value] = attr.split('=');
          node.attrs[name] = value.replace(/"/g, '');
        })
        if (node.name === 'p') {
          const endTag = htmlNode.match(/<\/[a-z0-9]+>/);
          const text = this.htmlDecode(htmlNode.substring(startTag.index + startTag[0].length, endTag.index).trim());
          node.children = [{
            text,
            type: 'text',
          }]
        }
        return node;
      })
    },

    /**
     * 方法：将节点转为HTML
     */
    nodeListToHTML: function () {
      return this.data.nodeList.map(node => `<${node.name} ${Object.keys(node.attrs).map(key => `${key}="${node.attrs[key]}"`).join(' ')}>${node.children ? this.htmlEncode(node.children[0].text) : ''}</${node.name}>`).join('');
    },

    /**
     * 方法：上传图片
     */
    uploadImage: function (node) {
      return new Promise(resolve => {
        let options = {
          filePath: node.attrs.src,
          url: this.properties.imageUploadUrl,
          name: this.properties.imageUploadName,
        }
        if (this.properties.imageUploadHeader) {
          options.header = this.properties.imageUploadHeader;
        }
        if (this.properties.imageUploadFormData) {
          options.formData = this.properties.imageUploadFormData;
        }
        options.success = res => {
          const keyChain = this.properties.imageUploadKeyChain.split('.');
          let url = JSON.parse(res.data);
          keyChain.forEach(key => {
            url = url[key];
          })
          node.attrs.src = url;
          node.attrs._uploaded = true;
          resolve();
        }
        wx.uploadFile(options);
      })
    },

    /**
     * 方法：处理节点，递归
     */
    handleOutput: function (index = 0) {
      let nodeList = this.data.nodeList;
      if (index >= nodeList.length) {
        wx.hideLoading();
        if (this.properties.outputType.toLowerCase() === 'array') {
          this.triggerEvent('finish', { content: this.data.nodeList });
        }
        if (this.properties.outputType.toLowerCase() === 'html') {
          this.triggerEvent('finish', { content: this.nodeListToHTML() });
        }
        return;
      }
      const node = nodeList[index];
      if (node.name === 'img' && !node.attrs._uploaded) {
        this.uploadImage(node).then(() => {
          this.handleOutput(index + 1)
        });
      } else {
        this.handleOutput(index + 1);
      }
    },
  }
})
