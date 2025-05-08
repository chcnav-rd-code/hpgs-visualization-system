/**
 * Potree原生量测工具模块
 * 提供点位置、距离和面积测量功能
 *
 * @param {Object} potreeViewer - Potree查看器实例
 */
function PotreeMeasurement(potreeViewer) {
  // 检查Potree viewer是否有效
  if (!potreeViewer || !potreeViewer.measuringTool) {
    console.error("PotreeMeasurement: Potree viewer或measuringTool未定义!");
    return null;
  }

  this.viewer = potreeViewer;
  this.measuringTool = potreeViewer.measuringTool;
  this.continuousMeasure = false;
  this.activeMeasurementType = null;
  this.measurementButtons = [];

  // 绑定方法到实例
  this.startPointMeasurement = this.startPointMeasurement.bind(this);
  this.startDistanceMeasurement = this.startDistanceMeasurement.bind(this);
  this.startAreaMeasurement = this.startAreaMeasurement.bind(this);
  this.clearAll = this.clearAll.bind(this);
  this.stopMeasurement = this.stopMeasurement.bind(this);
  this.setContinuousMeasurement = this.setContinuousMeasurement.bind(this);
  this.handleMeasurementComplete = this.handleMeasurementComplete.bind(this);
  this.clearActiveButtons = this.clearActiveButtons.bind(this);

}

/**
 * 初始化量测控件
 * @param {Object} options - 配置选项
 * @param {Boolean} options.continuousMeasurement - 是否启用连续测量
 * @param {String} options.pointButtonId - 点位置测量按钮ID
 * @param {String} options.distanceButtonId - 距离测量按钮ID
 * @param {String} options.areaButtonId - 面积测量按钮ID
 * @param {String} options.clearButtonId - 清除按钮ID
 * @param {String} options.stopButtonId - 停止按钮ID
 * @param {String} options.continuousCheckboxId - 连续测量复选框ID
 * @param {Function} options.onMeasureStart - 测量开始回调
 * @param {Function} options.onMeasureComplete - 测量完成回调
 */
PotreeMeasurement.prototype.init = function (options) {
  options = options || {};

  // 默认选项
  var defaultOptions = {
    continuousMeasurement: false,
    pointButtonId: "btn-measure-point",
    distanceButtonId: "btn-measure-distance",
    areaButtonId: "btn-measure-area",
    clearButtonId: "btn-measure-clear",
    stopButtonId: "btn-measure-stop",
    continuousCheckboxId: "chk-continuous-measure",
    onMeasureStart: null,
    onMeasureComplete: null,
  };

  // 合并选项
  var opts = {};
  for (var key in defaultOptions) {
    opts[key] = options.hasOwnProperty(key)
      ? options[key]
      : defaultOptions[key];
  }

  // 保存回调函数
  this.onMeasureStart =
    typeof opts.onMeasureStart === "function" ? opts.onMeasureStart : null;
  this.onMeasureComplete =
    typeof opts.onMeasureComplete === "function"
      ? opts.onMeasureComplete
      : null;

  // 初始化连续测量模式
  this.continuousMeasure = opts.continuousMeasurement;

  // 保存按钮ID
  this.measurementButtons = [
    opts.pointButtonId,
    opts.distanceButtonId,
    opts.areaButtonId,
    opts.stopButtonId,
  ];

  var self = this;

  // 绑定按钮事件
  var pointButton = document.getElementById(opts.pointButtonId);
  if (pointButton) {
    pointButton.addEventListener("click", function () {
      self.clearActiveButtons();
      this.classList.add("active");
      if (self.onMeasureStart) self.onMeasureStart("point");
      self.startPointMeasurement();
    });
  }

  var distanceButton = document.getElementById(opts.distanceButtonId);
  if (distanceButton) {
    distanceButton.addEventListener("click", function () {
      self.clearActiveButtons();
      this.classList.add("active");
      if (self.onMeasureStart) self.onMeasureStart("distance");
      self.startDistanceMeasurement();
    });
  }

  var areaButton = document.getElementById(opts.areaButtonId);
  if (areaButton) {
    areaButton.addEventListener("click", function () {
      self.clearActiveButtons();
      this.classList.add("active");
      if (self.onMeasureStart) self.onMeasureStart("area");
      self.startAreaMeasurement();
    });
  }

  var clearButton = document.getElementById(opts.clearButtonId);
  if (clearButton) {
    clearButton.addEventListener("click", function () {
      self.clearAll();
    });
  }

  var stopButton = document.getElementById(opts.stopButtonId);
  if (stopButton) {
    stopButton.addEventListener("click", function () {
      self.stopMeasurement();
    });
  }

  var continuousCheckbox = document.getElementById(opts.continuousCheckboxId);
  if (continuousCheckbox) {
    continuousCheckbox.checked = this.continuousMeasure;
    continuousCheckbox.addEventListener("change", function (e) {
      self.setContinuousMeasurement(e.target.checked);
    });
  }

  console.log("Potree原生量测工具初始化完成");
};

/**
 * 处理测量完成的回调
 * @param {Object} e - 事件对象
 */
PotreeMeasurement.prototype.handleMeasurementComplete = function (e) {
  console.log("Potree测量完成:", e.measurement);

  // 触发用户回调
  if (this.onMeasureComplete) {
    this.onMeasureComplete(e.measurement);
  }

  var self = this;

  // 如果是连续测量模式，自动启动下一次相同类型的测量
  if (this.continuousMeasure && this.activeMeasurementType) {
    setTimeout(function () {
      // 根据当前活动类型启动新的测量
      switch (self.activeMeasurementType) {
        case "point":
          self.startPointMeasurement();
          break;
        case "distance":
          self.startDistanceMeasurement();
          break;
        case "area":
          self.startAreaMeasurement();
          break;
      }
    }, 200); // 短暂延迟以确保前一个测量完全处理完毕
  } else {
    // 如果不是连续测量模式，清除激活状态
    this.clearActiveButtons();
    this.activeMeasurementType = null;
  }
};

/**
 * 启动点位置测量
 */
PotreeMeasurement.prototype.startPointMeasurement = function () {
  var self = this;
  this.activeMeasurementType = "point";
  this.measuringTool.startInsertion({
    showDistances: false,
    showArea: false,
    showCoordinates: true,
    showAngles: false,
    closed: false,
    maxMarkers: 1,
    name: "点位置",
    callbackWhenFinished: function (measurement) {
      console.log("点位置测量完成:", measurement);
      self.handleMeasurementComplete({ measurement: measurement });
    },
  });
};

/**
 * 启动距离测量
 */
PotreeMeasurement.prototype.startDistanceMeasurement = function () {
  var self = this;
  this.activeMeasurementType = "distance";
  this.measuringTool.startInsertion({
    showDistances: true,
    showArea: false,
    showAngles: false,
    closed: false,
    name: "距离",
    callbackWhenFinished: function (measurement) {
      console.log("距离测量完成:", measurement);
      self.handleMeasurementComplete({ measurement: measurement });
    },
  });
};

/**
 * 启动面积测量
 */
PotreeMeasurement.prototype.startAreaMeasurement = function () {
  var self = this;
  this.activeMeasurementType = "area";
  this.measuringTool.startInsertion({
    showDistances: true,
    showArea: true,
    showAngles: false,
    closed: true,
    name: "面积",
    callbackWhenFinished: function (measurement) {
      console.log("面积测量完成:", measurement);
      self.handleMeasurementComplete({ measurement: measurement });
    },
  });
};

/**
 * 清除所有测量
 */
PotreeMeasurement.prototype.clearAll = function () {
  if (this.viewer && this.viewer.scene) {
    this.viewer.scene.removeAllMeasurements();
  }
  this.clearActiveButtons();
  this.activeMeasurementType = null;
};

/**
 * 停止当前测量
 */
PotreeMeasurement.prototype.stopMeasurement = function () {
  // 通过ESC键模拟停止测量
  var event = new KeyboardEvent("keydown", {
    key: "Escape",
    code: "Escape",
    keyCode: 27,
    which: 27,
    bubbles: true,
  });
  document.dispatchEvent(event);

  this.clearActiveButtons();
  this.activeMeasurementType = null;
};

/**
 * 设置连续测量模式
 * @param {Boolean} enable - 是否启用连续测量
 */
PotreeMeasurement.prototype.setContinuousMeasurement = function (enable) {
  this.continuousMeasure = !!enable;
};

/**
 * 获取连续测量模式状态
 * @return {Boolean} - 连续测量模式是否启用
 */
PotreeMeasurement.prototype.isContinuousMeasurement = function () {
  return this.continuousMeasure;
};

/**
 * 清除所有激活状态的按钮
 */
PotreeMeasurement.prototype.clearActiveButtons = function () {
  var self = this;
  this.measurementButtons.forEach(function (id) {
    var button = document.getElementById(id);
    if (button) button.classList.remove("active");
  });
};

/**
 * 销毁并清理资源
 */
PotreeMeasurement.prototype.destroy = function () {
  // 移除事件监听器
  this.viewer.removeEventListener(
    "measurement_added",
    this.handleMeasurementComplete
  );

  // 清除所有测量
  this.clearAll();

  console.log("Potree量测工具已销毁");
};

// 导出模块
window.PotreeMeasurement = PotreeMeasurement;
