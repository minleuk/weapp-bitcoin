//mining.js
import _ from '../../utils/util.js';
import API from '../../services/api';
import Storage from '../../components/storage';

let stopwatchInterval;
stopwatchInterval = 0;
const WEIGHT = 4;

const ctx = wx.createCanvasContext('canvasArcCir');
let step = 1;
let startAngle = 1.5 * Math.PI;
let endAngle = 0;
const n = 600; // 一分钟

Page({
  data: {
    articleId: 0,
    speed: 0, // 1小时挖出的币数
    gold: '0.0000',
    // time: '00:00:00',
    status: true, // start:开始，stop:停止
    errorMsg: '',
    hasData: false
  },
  onLoad: function (options) {
    // 页面初始化 options为页面跳转所带来的参数
    console.log('onLoad');
    const that = this;
    _.showLoading();
    that.fetchData();
  },
  onReady: function () {
    // 页面渲染完成
    console.log('onReady');
  },
  onShow: function () {
  },
  onShareAppMessage: function (options) {
    const name = App.globalData.WechatUser.nickName || App.globalData.defaultName;
    return {
      title: name + '教你如何挖出价值不菲的比特币！',
      path: '/pages/mining/mining',
      success: function (res) {
        // 转发成功
        console.log(res);
      },
      fail: function (res) {
        // 转发失败
        console.log(res.errMsg);
      }
    };
  },
  reloadData: function () {
    const that = this;
    _.showLoading();
    that.fetchData();
  },
  fetchData: function () {
    const that = this;
    API.handleMineGet().then(json => {
      console.log('miningInfo: ', JSON.stringify(json, null, 2));
      _.hideLoading();
      if (json && json.code === 0) {
        const data = json.data;
        that.setData({
          articleId: data.article_id,
          errorMsg: '',
          hasData: true
        });
        that.initDraw();
        that.initWatch(data);
      } else {
        that.setData({
          errorMsg: '暂时没有数据哦~',
          hasData: false
        });
      }
    }, error => {
      _.hideLoading();
      that.setData({
        errorMsg: '咦，网络不见了，请检查网络连接后点击页面刷新~',
        hasData: false
      });
      console.error('咦，网络不见了，请检查网络连接后点击页面刷新~', error);
    });
  },
  initWatch: function (data) {
    const that = this;
    const speed = data.speed;
    const srt = data.total; // Storage.readSync('stopwatchRunningTime');
    const sbt = data.start_time; // Storage.readSync('stopwatchBeginingTimestamp');
    if (!data.is_stop) { // Number(sbt) && Number(srt)
      const runningTime = Number(srt) + data.timestamp - Number(sbt); // data.timestamp = new Date().getTime()
      Storage.writeSync('stopwatchRunningTime', runningTime);
      that.startWatch(speed, data.timestamp, data.total);
    }

    if (srt) {
      that.setData({
        speed: speed,
        gold: (speed / 3600000 * Number(srt)).toFixed(WEIGHT) // data.xbtc
        // time: that.returnFormattedToMilliseconds(Number(srt))
      });
      Storage.writeSync('stopwatchRunningTime', srt);
    } else {
      that.setData({
        speed: speed
      });
      Storage.writeSync('stopwatchRunningTime', 0);
    }
  },
  startWatch: function (sped, startTimestamp, total) {
    const that = this;
    const speed = sped || that.data.speed;

    clearInterval(stopwatchInterval);

    // const startTimestamp = new Date().getTime();
    let runningTime = 0;
    // const str = Storage.readSync('stopwatchRunningTime');

    Storage.writeSync('stopwatchBeginingTimestamp', startTimestamp);

    if (Number(total)) { // str
      runningTime = Number(total); // str
    } else {
      Storage.writeSync('stopwatchRunningTime', 1);
    }

    that.setData({
      status: false
    });

    stopwatchInterval = setInterval(function () {
      const now = new Date().getTime();
      const night = new Date().setHours(23, 59, 59, 500); // 当天晚上23:59:59 500
      let stopwatchTime;
      if (now <= night) {
        stopwatchTime = (now - startTimestamp + runningTime);
        that.animation();
        that.setData({
          gold: (speed / 3600000 * stopwatchTime).toFixed(WEIGHT)
          // time: that.returnFormattedToMilliseconds(stopwatchTime)
        });
      } else {
        that.pauseWatch(night);
      }
    }, 100);
  },
  pauseWatch: function (startTimestamp, total) {
    const that = this;
    clearInterval(stopwatchInterval);
    // const bt = Storage.readSync('stopwatchBeginingTimestamp');
    // const srt = Storage.readSync('stopwatchRunningTime');
    // console.log('stopwatchBeginingTimestamp: ', bt, ' stopwatchRunningTime', srt);
    // if (Number(bt)) {
      // const runningTime = Number(srt) + startTimestamp - Number(bt); // startTimestamp = new Date().getTime()

    Storage.writeSync('stopwatchBeginingTimestamp', 0);
    Storage.writeSync('stopwatchRunningTime', total); // runningTime

    that.setData({
      status: true
    });
    // }
  },
  resetWatch: function () {
    const that = this;
    clearInterval(stopwatchInterval);

    Storage.writeSync('stopwatchBeginingTimestamp', 0);
    Storage.writeSync('stopwatchRunningTime', 0);
    that.setData({
      gold: '0.0000',
      // time: that.returnFormattedToMilliseconds(0),
      status: true
    });
  },
  returnFormattedToMilliseconds: function (time) {
    const milliseconds = Math.floor((time % 1000) / 100);
    const seconds = Math.floor((time / 1000) % 60);
    const minutes = Math.floor((time / (1000 * 60)) % 60);
    const hours = Math.floor((time / (1000 * 60 * 60)) % 24);

    return _.formatTime(hours) + ":" + _.formatTime(minutes) + ":" + _.formatTime(seconds) + "." + milliseconds;
  },
  goto: function (e) {
    const that = this;
    const ds = e.currentTarget.dataset;
    const status = ds.status;
    const speed = that.data.speed;
    console.log('status: ', status);
    if (status) {
      API.handleMineStart().then(json => {
        console.log('mineStart: ', JSON.stringify(json, null, 2));
        if (json && json.code === 0) {
          const data = json.data;
          that.startWatch(speed, data.timestamp, data.total);
        } else {
          wx.showToast({
            title: '接口异常，请重试~',
            icon: 'loading',
            duration: 3000
          });
        }
      }, error => {
        wx.showToast({
          title: '接口异常，请重试~',
          icon: 'loading',
          duration: 3000
        });
        console.error('咦，网络不见了，请检查网络连接后点击页面刷新~', error);
      });
    } else {
      API.handleMineStop().then(json => {
        console.log('mineStop: ', JSON.stringify(json, null, 2));
        if (json && json.code === 0) {
          const data = json.data;
          that.pauseWatch(data.timestamp, data.total);
        } else {
          wx.showToast({
            title: '接口异常，请重试~',
            icon: 'loading',
            duration: 3000
          });
        }
      }, error => {
        wx.showToast({
          title: '接口异常，请重试~',
          icon: 'loading',
          duration: 3000
        });
        console.error('咦，网络不见了，请检查网络连接后点击页面刷新~', error);
      });
    }
  },
  animation: function () {
    if (step <= n) {
      endAngle = step * 2 * Math.PI / n + 1.5 * Math.PI;
      this.drawArc(startAngle, endAngle);
      step++;
    } else {
      step = 1;
    }
  },
  initDraw: function() {
    var cxt_arc = wx.createCanvasContext('canvasCircle');
    cxt_arc.setLineWidth(4);
    cxt_arc.setStrokeStyle('#ffffff');
    cxt_arc.setLineCap('round');
    cxt_arc.beginPath();
    cxt_arc.arc(100, 100, 96, 0, 2 * Math.PI, false);
    cxt_arc.stroke();
    cxt_arc.draw();
  },
  drawArc: function (s, e) {
    ctx.setFillStyle('white');
    ctx.clearRect(0, 0, 200, 200);
    ctx.draw();
    var x = 100, y = 100, radius = 96;
    ctx.setLineWidth(4);
    ctx.setStrokeStyle('#f02e2e'); // '#'+('00000'+(Math.random()*0x1000000<<0).toString(16)).slice(-6)
    ctx.setLineCap('round');
    ctx.beginPath();
    ctx.arc(x, y, radius, s, e, false);
    ctx.stroke();
    ctx.draw();
  }
});
