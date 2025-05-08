/**
 * 加载las文件
 * @description 加载las文件，并将其添加到场景中
 * @date 2025-04-29
 * @example
 * loadLas({
 *   potreeViewer: potreeViewer,
 *   lasUrl: "https://minio-endpointdmp-pre.huacenav.com/cloud-dim/dim/10e070f640ff4d71a5c86cf307d737a4/9ca085ad8c8044abb5a24c735638027e/metadata.json",
 *   callback: function(pointcloud) {
 *     console.log(pointcloud);
 *   }
 * })
 */

/**
 * 加载las文件
 * @param {*} options
 * @param {Potree.Viewer} options.potreeViewer
 * @param {string} options.lasUrl
 * @param {function} options.callback
 */
function loadLas(options) {
  const { potreeViewer, lasUrl, callback, isFlyTo = true } = options;

  Potree.loadPointCloud(lasUrl, "potree_render_las", function (e) {
    let pointcloud = e.pointcloud;
    let scene = potreeViewer.scene;
    let material = pointcloud.material;

    scene.addPointCloud(pointcloud);

    material.size = 1;
    material.pointSizeType = Potree.PointSizeType.ADAPTIVE;
    material.shape = Potree.PointShape.CIRCLE;

    if (isFlyTo) {
      // potreeViewer.fitToScreen();
      scene.view.setView(
        [-3.008, -20.191, 2.5],
        [6.0, 1.552, 0.242]
      );
    }

    // 设置坐标系转换
    try {
      let pointcloudProjection = e.pointcloud.projection;

      // 确保点云投影定义存在
      if (pointcloudProjection) {
        // 确保WGS84定义存在
        if (!proj4.defs["WGS84"]) {
          // 如果WGS84定义不存在，手动定义它
          proj4.defs(
            "WGS84",
            "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs"
          );
        }

        let mapProjection = proj4.defs("WGS84");

        // 创建坐标转换函数
        window.toMap = proj4(pointcloudProjection, mapProjection);
        window.toScene = proj4(mapProjection, pointcloudProjection);

        console.log("坐标系转换设置成功");
      } else {
        console.warn("点云没有投影定义，无法设置坐标转换");
        // 创建空函数作为后备，防止调用出错
        window.toMap = function (point) {
          return point;
        };
        window.toScene = function (point) {
          return point;
        };
      }
    } catch (error) {
      console.error("设置坐标转换时出错:", error);
      // 创建空函数作为后备，防止调用出错
      window.toMap = function (point) {
        return point;
      };
      window.toScene = function (point) {
        return point;
      };
    }

    callback(pointcloud);
  });
}
