const app = getApp()

Page({
  data: {
    html: '<p class="xing-p">露西婶婶的生日即将到来，帕丁顿决定送婶婶一份会让她终生难忘的礼物。 </p><img class="xing-img" style="width: 100%" src="https://img1.doubanio.com/view/photo/l/public/p2506042197.jpg" _height="0.41983" _uploaded="true"></img><p class="xing-p">最终，帕丁顿选中了一本立体绘本，然而这绘本是世间仅此一份的珍贵宝物，为了存钱购买绘本，帕丁顿决定开始工作，在遭遇了一连串的失败后，帕丁顿终于找到了适合他的工作——清洁玻璃窗。</p>',
  },

  finish: function (e) {
    console.log(e.detail.content);
  },
})
