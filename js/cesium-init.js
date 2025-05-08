/**
 * 初始化 Cesium
 * @description 初始化 Cesium，并返回 Cesium Viewer 实例
 * @date 2025-04-27
 * @example
 * initCesium(domId, callback)
 */
function initCesium(domId, callback) {
  if (!domId) {
    return;
  }
  const ION_TOKEN =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3ZDE3YTE1Ni1iYTJjLTRjYjAtYTIyYi0zMDQ0M2UwN2NlNmQiLCJpZCI6NTg3MjcsImlhdCI6MTYyMzM4OTE3NH0.PS43TPHDe7ewqpHVLZXU4rrNC9E132RWas92ql_1jPI";
  Cesium.Ion.defaultAccessToken = ION_TOKEN;
  // 创建 Cesium Viewer 实例
  var viewer = new Cesium.Viewer(domId, {
    imageryProvider: false,
    timeline: false,
    animation: false,
    baseLayerPicker: false,
  });
  // 抗锯齿
  viewer.scene.postProcessStages.fxaa.enabled = true;
  // 设置地球背景为黑色
  viewer.scene.backgroundColor = Cesium.Color.BLACK;
  // 禁用天空盒，保持黑色背景
  viewer.scene.skyBox.show = false;
  // 禁用大气和地球光环，保持黑色背景
  viewer.scene.globe.showGroundAtmosphere = false;
  viewer.scene.sun.show = false;
  viewer.scene.moon.show = false;
  // 将地球设为透明，以适应黑色背景
  viewer.scene.globe.baseColor = Cesium.Color.BLACK;
  // 设置只拾取模型
  viewer.onlyPickModelPosition = true;
  // 获取当前的影像图层集合
  var imageryLayers = viewer.imageryLayers;
  // 禁用大气层
  viewer.scene.skyAtmosphere.show = false;

  // 遍历所有影像图层，将其隐藏
  for (var i = 0; i < imageryLayers.length; i++) {
    var layer = imageryLayers.get(i);
    layer.show = false;
  }

  // 获取 ScreenSpaceCameraController
  var cameraController = viewer.scene.screenSpaceCameraController;

  // 将旋转操作绑定到鼠标左键按住事件
  cameraController.tiltEventTypes = [Cesium.CameraEventType.LEFT_DRAG];
  cameraController.zoomEventTypes = [
    Cesium.CameraEventType.MIDDLE_DRAG,
    Cesium.CameraEventType.WHEEL,
    Cesium.CameraEventType.PINCH,
  ];
  cameraController.rotateEventTypes = [Cesium.CameraEventType.RIGHT_DRAG];

  // 自定义旋转灵敏度
  // 限制相机缩放的最小和最大距离
  cameraController.minimumZoomDistance = 1;
  cameraController.maximumZoomDistance = 50.0;
  cameraController.zoomFactor = 1.0;
  cameraController.enableCollisionDetection = true;
  // cameraController.enableRotate = false;
  cameraController.inertiaTranslate = 0.005; // 设置平移惯性（值越小，惯性越小）
  // cameraController.minimumMovementRatio = 0.05; // 设置最小移动比例（值越小，灵敏度越高）
  cameraController.maximumMovementRatio = 0.005; // 设置最大移动比例（值越大，灵敏度越高）
  // cameraController.maximumTiltAngle = 0.005; // 设置最大移动比例（值越大，灵敏度越高）

  callback(viewer);
}
