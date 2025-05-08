/**
 * 加载3dtiles的transform矩阵
 * @param {*} tilesetUrl
 */
async function loadTransformMatrix(tilesetUrl) {
  try {
    // 使用 Fetch API 加载 tileset.json
    const response = await fetch(tilesetUrl + "/tileset.json");
    const tileset = await response.json();

    // 检查是否存在 transform 属性
    if (tileset.root && tileset.root.transform) {
      // 提取 transform 矩阵并赋值给 window.transformMatrix
      window.transformMatrix = tileset.root.transform;
      console.log("Transform matrix loaded:", window.transformMatrix);
    } else {
      console.warn("No transform matrix found in tileset.json");
    }

    // 尝试加载metadata.xml以获取SRSOrigin
    const metadataResponse = await fetch(tilesetUrl + "/metadata.xml");
    const metadataText = await metadataResponse.text();

    // 解析XML文档
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(metadataText, "text/xml");
    // 获取SRSOrigin元素的值
    const srsOriginElement = xmlDoc.getElementsByTagName("SRSOrigin")[0];
    if (srsOriginElement && srsOriginElement.textContent) {
      // 解析SRSOrigin字符串为坐标数组
      const originString = srsOriginElement.textContent;
      const originCoords = originString
        .split(",")
        .map((coord) => parseFloat(coord));

      if (originCoords.length === 3) {
        window.srsOrigin = {
          x: originCoords[0],
          y: originCoords[1],
          z: originCoords[2],
        };
        console.log("SRS Origin loaded:", window.srsOrigin);
      } else {
        console.warn("Invalid SRSOrigin format in metadata.xml");
      }
    } else {
      console.warn("No SRSOrigin found in metadata.xml");
    }

    if (window.srsOrigin && window.transformMatrix) {
      // 循环更新potree的相机
      requestAnimationFrame(loop);
    } else {
      console.warn("No SRSOrigin or transform matrix found in metadata.xml");
    }
  } catch (error) {
    console.error("Error loading tileset.json:", error);
  }
}

/**
 * 循环更新potree的相机
 * @param {*} timestamp
 */
function loop(timestamp) {
  if (
    typeof potreeViewer === "undefined" ||
    typeof cesiumViewer === "undefined"
  ) {
    return;
  }

  requestAnimationFrame(loop);

  potreeViewer.update(potreeViewer.clock.getDelta(), timestamp);

  potreeViewer.render();

  // 如果 3D Tiles 的 transform_matrix 存在，则动态应用变换
  if (window.transformMatrix !== undefined && window.srsOrigin !== undefined) {
    // 获取点云的相机信息
    let camera = potreeViewer.scene.getActiveCamera();

    // 获取相机的位置、方向和目标点
    let pPos = new THREE.Vector3(0, 0, 0).applyMatrix4(camera.matrixWorld); // 相机位置
    let pUp = new THREE.Vector3(0, 600, 0).applyMatrix4(camera.matrixWorld); // 相机上方向点
    let pTarget = potreeViewer.scene.view.getPivot(); // 视图中心点

    // 将 transformMatrix 转为 Cesium 的 Matrix4 对象
    let cesiumTransformMatrix = Cesium.Matrix4.fromArray(
      window.transformMatrix
    );

    // 定义一个工具函数，用于动态应用 transform_matrix
    function applyTransformMatrix(point, transformMatrix) {
      // 转换为齐次坐标 (x, y, z, 1)
      let pointCartesian4 = new Cesium.Cartesian4(
        point.x - window.srsOrigin.x,
        point.y - window.srsOrigin.y,
        point.z - window.srsOrigin.z,
        1
      );

      // 应用变换矩阵
      let transformedPoint = new Cesium.Cartesian4();
      Cesium.Matrix4.multiplyByVector(
        transformMatrix,
        pointCartesian4,
        transformedPoint
      );

      // 转换为非齐次坐标 (X/W, Y/W, Z/W)
      return new Cesium.Cartesian3(
        transformedPoint.x / transformedPoint.w,
        transformedPoint.y / transformedPoint.w,
        transformedPoint.z / transformedPoint.w
      );
    }

    // 应用 transform_matrix 将点云相机信息转换到地心地固坐标系
    let cPos = applyTransformMatrix(pPos, cesiumTransformMatrix); // 转换相机位置
    let cUpTarget = applyTransformMatrix(pUp, cesiumTransformMatrix); // 转换相机上方向
    let cTarget = applyTransformMatrix(pTarget, cesiumTransformMatrix); // 转换视图中心点

    // 计算方向向量和上方向向量
    let cDir = Cesium.Cartesian3.subtract(
      cTarget,
      cPos,
      new Cesium.Cartesian3()
    );
    let cUp = Cesium.Cartesian3.subtract(
      cUpTarget,
      cPos,
      new Cesium.Cartesian3()
    );

    // 归一化方向向量
    cDir = Cesium.Cartesian3.normalize(cDir, new Cesium.Cartesian3());
    cUp = Cesium.Cartesian3.normalize(cUp, new Cesium.Cartesian3());

    // 设置 Cesium 的相机视图
    cesiumViewer.camera.setView({
      destination: cPos,
      orientation: {
        direction: cDir,
        up: cUp,
      },
    });

    // 同步相机视野角度（FOV）
    let aspect = potreeViewer.scene.getActiveCamera().aspect;
    if (aspect < 1) {
      let fovy = Math.PI * (potreeViewer.scene.getActiveCamera().fov / 180);
      cesiumViewer.camera.frustum.fov = fovy;
    } else {
      let fovy = Math.PI * (potreeViewer.scene.getActiveCamera().fov / 180);
      let fovx = Math.atan(Math.tan(0.5 * fovy) * aspect) * 2;
      cesiumViewer.camera.frustum.fov = fovx;
    }

    // 渲染 Cesium 场景
    cesiumViewer.render();
  }

  // 检查 window.toMap 是否可用，并且是一个函数
  if (
    window.toMap !== undefined &&
    typeof window.toMap === "function" &&
    window.toMap.forward
  ) {
    try {
      let camera = potreeViewer.scene.getActiveCamera();

      let pPos = new THREE.Vector3(0, 0, 0).applyMatrix4(camera.matrixWorld);
      let pRight = new THREE.Vector3(600, 0, 0).applyMatrix4(
        camera.matrixWorld
      );
      let pUp = new THREE.Vector3(0, 600, 0).applyMatrix4(camera.matrixWorld);
      let pTarget = potreeViewer.scene.view.getPivot();

      let toCes = (pos) => {
        try {
          let xy = [pos.x, pos.y];
          let height = pos.z;
          let deg = window.toMap.forward(xy);

          // 确保deg是有效的经纬度数组
          if (Array.isArray(deg) && deg.length >= 2) {
            let cPos = Cesium.Cartesian3.fromDegrees(deg[0], deg[1], height);
            return cPos;
          } else {
            console.warn("Invalid coordinates returned from projection:", deg);
            // 返回原始位置，避免错误
            return Cesium.Cartesian3.fromDegrees(0, 0, 0);
          }
        } catch (err) {
          console.error("Error converting coordinates:", err);
          // 返回原始位置，避免错误
          return Cesium.Cartesian3.fromDegrees(0, 0, 0);
        }
      };

      let cPos = toCes(pPos);
      let cUpTarget = toCes(pUp);
      let cTarget = toCes(pTarget);

      // 确保所有点都有效
      if (cPos && cUpTarget && cTarget) {
        let cDir = Cesium.Cartesian3.subtract(
          cTarget,
          cPos,
          new Cesium.Cartesian3()
        );
        let cUp = Cesium.Cartesian3.subtract(
          cUpTarget,
          cPos,
          new Cesium.Cartesian3()
        );

        // 确保向量不是零向量
        if (
          !Cesium.Cartesian3.equals(cDir, Cesium.Cartesian3.ZERO) &&
          !Cesium.Cartesian3.equals(cUp, Cesium.Cartesian3.ZERO)
        ) {
          cDir = Cesium.Cartesian3.normalize(cDir, new Cesium.Cartesian3());
          cUp = Cesium.Cartesian3.normalize(cUp, new Cesium.Cartesian3());

          cesiumViewer.camera.setView({
            destination: cPos,
            orientation: {
              direction: cDir,
              up: cUp,
            },
          });

          let aspect = potreeViewer.scene.getActiveCamera().aspect;
          if (aspect < 1) {
            let fovy =
              Math.PI * (potreeViewer.scene.getActiveCamera().fov / 180);
            cesiumViewer.camera.frustum.fov = fovy;
          } else {
            let fovy =
              Math.PI * (potreeViewer.scene.getActiveCamera().fov / 180);
            let fovx = Math.atan(Math.tan(0.5 * fovy) * aspect) * 2;
            cesiumViewer.camera.frustum.fov = fovx;
          }

          // 渲染Cesium场景
          cesiumViewer.render();
        }
      }
    } catch (error) {
      console.error("Error in coordinate transformation:", error);
    }
  }
}
