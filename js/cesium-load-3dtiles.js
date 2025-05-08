/**
 * 加载 3D Tiles 数据
 * @description 加载 3D Tiles 数据，并将其添加到场景中
 * @date 2025-04-27
 * @example
 * load3Dtiles({
 *   viewer: viewer,
 *   url: "https://cocloud-test.obs.cn-east-2.myhuaweicloud.com/temp/o1/tileset.json",
 *   callback: function(tileset) {
 *     console.log(tileset);
 *   }
 * })
 */

/**
 * 加载 3D Tiles 数据
 * @param {*} options
 * @param {Cesium.Viewer} options.viewer
 * @param {string} options.url
 * @param {function} options.callback
 * @param {boolean} options.isFlyTo
 */
async function load3Dtiles(options) {
  const { viewer, url, callback, isFlyTo = true } = options;

  // 加载 3D Tiles 数据，这里使用的是 Cesium Ion 上的示例数据，你需要替换为自己的 3D Tiles 数据地址
  var tileset = await Cesium.Cesium3DTileset.fromUrl(url, {
    // modelMatrix: computeModelMatrix(),
    orientation: new Cesium.HeadingPitchRoll(0.0, -0.5, 0.0),
  });

  // 将 3D Tiles 数据集添加到场景中
  viewer.scene.primitives.add(tileset);
  console.log("3D Tiles 中心 (ECEF):", tileset.boundingSphere.center);

  var modelMatrix = tileset.modelMatrix;
  var rotationCenter = Cesium.Matrix4.getTranslation(
    modelMatrix,
    new Cesium.Cartesian3()
  );

  console.log("3D Tiles 旋转中心 (ECEF):", rotationCenter);
  console.log(
    "3D Tiles 旋转中心 (WGS84):",
    Cesium.Cartographic.fromCartesian(rotationCenter)
  );

  // 计算 ENU 变换矩阵（以模型中心为基准）
  var transformMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(
    tileset.boundingSphere.center
  );

  // 设置相机围绕该点旋转
  viewer.camera.lookAtTransform(transformMatrix);

  var transformMatrix = viewer.camera.transform;
  var cameraRotationCenter = Cesium.Matrix4.getTranslation(
    transformMatrix,
    new Cesium.Cartesian3()
  );

  console.log("相机旋转中心 (ECEF):", cameraRotationCenter);
  console.log(
    "相机旋转中心 (WGS84):",
    Cesium.Cartographic.fromCartesian(cameraRotationCenter)
  );

  if (isFlyTo) {
    // 定位相机到 3D Tiles 数据所在位置
    viewer.flyTo(tileset);
  }

  // 自定义 Home 键的视角
  var customHomeView = {
    destination: tileset.boundingSphere.center, //Cesium.Cartesian3.fromDegrees(121.588177, 29.905207, 1.00),
    orientation: {
      heading: Cesium.Math.toRadians(0.0),
      pitch: Cesium.Math.toRadians(-4.2),
      roll: 0.0,
    },
  };

  // 重新定义 homeButton 的 command
  viewer.homeButton.viewModel.command.beforeExecute.addEventListener(function (
    e
  ) {
    // 阻止默认行为
    e.cancel = true;
    // 让相机飞到自定义的 Home 视角
    // viewer.camera.flyTo(customHomeView);
    viewer.flyTo(tileset);
  });

  callback(tileset);
}

/**
 * 计算模型矩阵
 * @description 计算模型矩阵，用于将 3D Tiles 数据集添加到场景中
 * @date 2025-04-27
 * @example
 * computeModelMatrix()
 */
function computeModelMatrix() {
  var origin = Cesium.Cartesian3.fromDegrees(120, 30, 50);

  // 计算基础矩阵
  var modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(origin);

  return modelMatrix;
}
