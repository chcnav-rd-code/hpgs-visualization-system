/**
 * Cesium量测工具类
 * 提供点位置、线距离和面积的量测功能
 * 
 * @param {Cesium.Viewer} viewer - Cesium Viewer实例
 * @param {Object} options - 配置选项
 * @param {Object} options.pointOptions - 点量测样式选项
 * @param {Object} options.lineOptions - 线量测样式选项
 * @param {Object} options.areaOptions - 面量测样式选项
 * @param {Boolean} options.continuousMeasurement - 是否启用连续测量，默认为false
 * @returns {Object} - 量测工具对象
 */
function CesiumMeasurement(viewer, options = {}) {
  const scene = viewer.scene;
  const camera = viewer.camera;
  const canvas = viewer.canvas;
  let handler = null;

  // 是否启用连续测量
  let continuousMeasurement =
    options.continuousMeasurement !== undefined
      ? options.continuousMeasurement
      : false;

  // 保存默认的双击事件处理器
  const defaultDoubleClickAction =
    viewer.cesiumWidget.screenSpaceEventHandler.getInputAction(
      Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
    );

  // 量测相关实体集合
  const entities = {
    points: [],
    lines: [],
    areas: [],
    labels: [],
  };

  // 当前状态
  const state = {
    measuring: false,
    measureType: null, // 'point', 'line', 'area'
    activePositions: [],
    activeEntity: null,
    tempEntities: [],
  };

  // 量测样式配置
  const pointOptions = Object.assign(
    {
      pixelSize: 10,
      color: Cesium.Color.RED,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
      disableDepthTestDistance: Number.POSITIVE_INFINITY, // 确保始终可见
      heightReference: Cesium.HeightReference.NONE, // 不贴地，使用精确坐标
    },
    options.pointOptions || {}
  );

  const lineOptions = Object.assign(
    {
      width: 3,
      material: new Cesium.ColorMaterialProperty(Cesium.Color.YELLOW),
      clampToGround: false, // 不贴地，使用精确坐标
      classificationType: Cesium.ClassificationType.BOTH, // 对地形和3D Tiles都进行分类
      zIndex: 100, // 确保线显示在其他实体上方
    },
    options.lineOptions || {}
  );

  const areaOptions = Object.assign(
    {
      material: new Cesium.ColorMaterialProperty(
        Cesium.Color.YELLOW.withAlpha(0.4)
      ),
      outline: true,
      outlineColor: Cesium.Color.YELLOW,
      outlineWidth: 2,
      height: 0, // 零高度，允许多边形贴合模型
      perPositionHeight: true, // 重要：使用每个顶点的高度
      classificationType: Cesium.ClassificationType.BOTH,
    },
    options.areaOptions || {}
  );

  const labelOptions = Object.assign(
    {
      font: "14px sans-serif",
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -10),
      heightReference: Cesium.HeightReference.NONE, // 不贴地，使用精确坐标
      disableDepthTestDistance: Number.POSITIVE_INFINITY, // 确保始终可见
    },
    options.labelOptions || {}
  );

  // 事件回调
  let onMeasureComplete = null; // 测量完成回调

  /**
   * 创建点击事件处理
   * @private
   */
  function _createHandler() {
    // 移除已有的处理器
    _destroyHandler();

    // 创建新的处理器
    handler = new Cesium.ScreenSpaceEventHandler(canvas);

    // 左键点击添加点
    handler.setInputAction((event) => {
      if (!state.measuring) return;

      const cartesian = _getCartesianFromClick(event.position);
      if (!cartesian) return;

      // 添加当前点击位置
      state.activePositions.push(cartesian);

      // 根据当前量测类型进行处理
      switch (state.measureType) {
        case "point":
          _handlePointMeasure(cartesian);
          break;
        case "line":
          _handleLineMeasure();
          break;
        case "area":
          _handleAreaMeasure();
          break;
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // 双击结束量测
    handler.setInputAction((event) => {
      if (!state.measuring) return;

      // 对于线和面积量测，双击结束
      if (
        state.measureType === "line" ||
        state.measureType === "area"
      ) {
        // 如果有足够的点(线至少2个点，面至少3个点)才结束量测
        const minPoints = state.measureType === "line" ? 2 : 3;
        if (state.activePositions.length >= minPoints) {
          _finishMeasure();
          console.log(
            `双击结束${state.measureType === "line" ? "线" : "面积"}量测`
          );
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

    // 鼠标移动更新临时实体
    handler.setInputAction((event) => {
      if (!state.measuring) return;

      const cartesian = _getCartesianFromClick(event.endPosition);
      if (!cartesian) return;

      // 根据当前量测类型进行临时处理
      switch (state.measureType) {
        case "line":
          _updateLineMeasure(cartesian);
          break;
        case "area":
          _updateAreaMeasure(cartesian);
          break;
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    // 右键完成当前量测
    handler.setInputAction((event) => {
      if (!state.measuring) return;

      if (
        state.measureType === "line" ||
        state.measureType === "area"
      ) {
        // 如果有足够的点(线至少2个点，面至少3个点)才结束量测
        const minPoints = state.measureType === "line" ? 2 : 3;
        if (state.activePositions.length >= minPoints) {
          _finishMeasure();
          console.log(
            `右键结束${state.measureType === "line" ? "线" : "面积"}量测`
          );
        }
      }
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
  }

  /**
   * 销毁事件处理器
   * @private
   */
  function _destroyHandler() {
    if (handler) {
      handler.destroy();
      handler = null;
    }
  }

  /**
   * 从屏幕点击获取空间笛卡尔坐标
   * @param {Cesium.Cartesian2} position - 屏幕位置
   * @returns {Cesium.Cartesian3|null} - 空间坐标或null
   * @private
   */
  function _getCartesianFromClick(position) {
    // 尝试拾取模型或地形
    const pickedObject = scene.pick(position);
    
    if (Cesium.defined(pickedObject) && pickedObject.primitive) {
      // 如果点击到了实体，则拾取位置
      const cartesian = scene.pickPosition(position);
      if (Cesium.defined(cartesian)) {
        return cartesian;
      }
    }
    
    // 未命中实体时，尝试直接拾取椭球体或地形
    const ray = camera.getPickRay(position);
    if (!ray) return null;
    
    // 1. 首先尝试拾取地形
    const cartesian = scene.globe.pick(ray, scene);
    if (Cesium.defined(cartesian)) {
      return cartesian;
    }
    
    // 2. 如果没有地形，尝试拾取椭球体
    return scene.camera.pickEllipsoid(position, scene.globe.ellipsoid);
  }

  /**
   * 处理点量测
   * @param {Cesium.Cartesian3} position - 点击位置
   * @private
   */
  function _handlePointMeasure(position) {
    // 获取点击位置的高度
    const cartographic = Cesium.Cartographic.fromCartesian(position);
    const longitudeString = Cesium.Math.toDegrees(
      cartographic.longitude
    ).toFixed(6);
    const latitudeString = Cesium.Math.toDegrees(
      cartographic.latitude
    ).toFixed(6);
    const heightString = cartographic.height.toFixed(2);

    // 创建标注实体
    const labelText = `经度: ${longitudeString}\n纬度: ${latitudeString}\n高度: ${heightString}m`;

    // 创建点实体
    const pointEntity = viewer.entities.add({
      position: position,
      point: pointOptions,
      label: {
        ...labelOptions,
        text: labelText,
      },
    });

    // 添加到实体集合中
    entities.points.push(pointEntity);
    entities.labels.push(pointEntity);

    // 如果不是连续测量模式，则完成测量
    if (!continuousMeasurement) {
      _finishMeasure();
    }
  }

  /**
   * 处理线量测
   * @private
   */
  function _handleLineMeasure() {
    const positions = state.activePositions;
    const positionsLength = positions.length;

    // 至少需要两个点
    if (positionsLength < 2) return;

    // 移除之前的临时实体
    _removeTempEntities();

    // 计算总距离
    let totalDistance = 0;
    const segmentPositions = [];
    const segmentDistances = [];

    for (let i = 0; i < positionsLength - 1; i++) {
      const p1 = positions[i];
      const p2 = positions[i + 1];
      const distance = Cesium.Cartesian3.distance(p1, p2);
      segmentPositions.push([p1, p2]);
      segmentDistances.push(distance);
      totalDistance += distance;
    }

    // 创建或更新线实体
    if (!state.activeEntity) {
      state.activeEntity = viewer.entities.add({
        polyline: {
          ...lineOptions,
          positions: new Cesium.CallbackProperty(() => {
            return positions;
          }, false),
        },
      });
      state.tempEntities.push(state.activeEntity);
    }

    // 为每个线段创建距离标签
    for (let i = 0; i < segmentPositions.length; i++) {
      const midPoint = Cesium.Cartesian3.midpoint(
        segmentPositions[i][0],
        segmentPositions[i][1],
        new Cesium.Cartesian3()
      );
      const distance = segmentDistances[i];
      let distanceText;

      if (distance >= 1000) {
        distanceText = `${(distance / 1000).toFixed(2)} km`;
      } else {
        distanceText = `${distance.toFixed(2)} m`;
      }

      // 只为当前最后一段创建标签
      if (i === segmentPositions.length - 1) {
        const labelEntity = viewer.entities.add({
          position: midPoint,
          label: {
            ...labelOptions,
            text: distanceText,
          },
        });
        state.tempEntities.push(labelEntity);
      }
    }

    // 创建总距离标签
    if (positionsLength > 2) {
      let totalDistanceText;
      if (totalDistance >= 1000) {
        totalDistanceText = `总距离: ${(totalDistance / 1000).toFixed(2)} km`;
      } else {
        totalDistanceText = `总距离: ${totalDistance.toFixed(2)} m`;
      }

      const labelEntity = viewer.entities.add({
        position: positions[positionsLength - 1],
        label: {
          ...labelOptions,
          pixelOffset: new Cesium.Cartesian2(0, -30),
          text: totalDistanceText,
        },
      });
      state.tempEntities.push(labelEntity);
    }
  }

  /**
   * 更新线量测临时显示
   * @param {Cesium.Cartesian3} position - 当前鼠标位置
   * @private
   */
  function _updateLineMeasure(position) {
    if (state.activePositions.length === 0) return;

    // 移除之前的临时实体
    _removeTempEntities();

    // 创建临时位置数组，包括鼠标当前位置
    const positions = [...state.activePositions, position];

    // 创建临时线实体
    state.activeEntity = viewer.entities.add({
      polyline: {
        ...lineOptions,
        positions: positions,
      },
    });
    state.tempEntities.push(state.activeEntity);

    // 计算最后一段距离
    const lastPosition = state.activePositions[state.activePositions.length - 1];
    const distance = Cesium.Cartesian3.distance(lastPosition, position);
    const midPoint = Cesium.Cartesian3.midpoint(
      lastPosition,
      position,
      new Cesium.Cartesian3()
    );

    // 显示临时距离
    let distanceText;
    if (distance >= 1000) {
      distanceText = `${(distance / 1000).toFixed(2)} km`;
    } else {
      distanceText = `${distance.toFixed(2)} m`;
    }

    const labelEntity = viewer.entities.add({
      position: midPoint,
      label: {
        ...labelOptions,
        text: distanceText,
      },
    });
    state.tempEntities.push(labelEntity);

    // 如果有多个点，显示总距离
    if (state.activePositions.length > 1) {
      let totalDistance = 0;
      for (let i = 0; i < state.activePositions.length - 1; i++) {
        const p1 = state.activePositions[i];
        const p2 = state.activePositions[i + 1];
        totalDistance += Cesium.Cartesian3.distance(p1, p2);
      }
      totalDistance += distance; // 加上临时线段的距离

      let totalDistanceText;
      if (totalDistance >= 1000) {
        totalDistanceText = `总距离: ${(totalDistance / 1000).toFixed(2)} km`;
      } else {
        totalDistanceText = `总距离: ${totalDistance.toFixed(2)} m`;
      }

      const totalLabelEntity = viewer.entities.add({
        position: position,
        label: {
          ...labelOptions,
          pixelOffset: new Cesium.Cartesian2(0, -30),
          text: totalDistanceText,
        },
      });
      state.tempEntities.push(totalLabelEntity);
    }
  }

  /**
   * 处理面积量测
   * @private
   */
  function _handleAreaMeasure() {
    const positions = state.activePositions;
    const positionsLength = positions.length;

    // 至少需要三个点形成面
    if (positionsLength < 3) return;

    // 移除之前的临时实体
    _removeTempEntities();

    // 确保区域闭合
    const closedPositions = [...positions];
    if (
      !Cesium.Cartesian3.equals(
        closedPositions[0],
        closedPositions[closedPositions.length - 1]
      )
    ) {
      closedPositions.push(closedPositions[0]);
    }

    // 创建或更新面实体
    if (!state.activeEntity) {
      state.activeEntity = viewer.entities.add({
        polygon: {
          ...areaOptions,
          hierarchy: new Cesium.CallbackProperty(() => {
            return new Cesium.PolygonHierarchy(positions);
          }, false),
        },
        polyline: {
          ...lineOptions,
          positions: new Cesium.CallbackProperty(() => {
            return [...positions, positions[0]]; // 确保闭合
          }, false),
        },
      });
      state.tempEntities.push(state.activeEntity);
    }

    // 计算面积
    const area = _calculatePolygonArea(positions);
    let areaText;

    if (area >= 1000000) {
      areaText = `面积: ${(area / 1000000).toFixed(2)} km²`;
    } else {
      areaText = `面积: ${area.toFixed(2)} m²`;
    }

    // 计算多边形中心点
    const centroid = _calculatePolygonCentroid(positions);

    // 创建面积标签
    const labelEntity = viewer.entities.add({
      position: centroid,
      label: {
        ...labelOptions,
        text: areaText,
      },
    });
    state.tempEntities.push(labelEntity);
  }

  /**
   * 更新面积量测临时显示
   * @param {Cesium.Cartesian3} position - 当前鼠标位置
   * @private
   */
  function _updateAreaMeasure(position) {
    if (state.activePositions.length < 2) return;

    // 移除之前的临时实体
    _removeTempEntities();

    // 创建临时位置数组，包括鼠标当前位置
    const positions = [...state.activePositions, position];
    const closedPositions = [...positions, positions[0]]; // 闭合多边形

    // 创建临时面实体
    state.activeEntity = viewer.entities.add({
      polygon: {
        ...areaOptions,
        hierarchy: new Cesium.PolygonHierarchy(positions),
      },
      polyline: {
        ...lineOptions,
        positions: closedPositions,
      },
    });
    state.tempEntities.push(state.activeEntity);

    // 如果有至少三个点，计算并显示面积
    if (positions.length >= 3) {
      const area = _calculatePolygonArea(positions);
      let areaText;

      if (area >= 1000000) {
        areaText = `面积: ${(area / 1000000).toFixed(2)} km²`;
      } else {
        areaText = `面积: ${area.toFixed(2)} m²`;
      }

      // 计算多边形中心点
      const centroid = _calculatePolygonCentroid(positions);

      // 创建面积标签
      const labelEntity = viewer.entities.add({
        position: centroid,
        label: {
          ...labelOptions,
          text: areaText,
        },
      });
      state.tempEntities.push(labelEntity);
    }
  }

  /**
   * 计算多边形面积
   * @param {Array<Cesium.Cartesian3>} positions - 多边形顶点坐标
   * @returns {Number} - 面积（平方米）
   * @private
   */
  function _calculatePolygonArea(positions) {
    if (positions.length < 3) {
      return 0;
    }

    // 转换为地理坐标
    const geographicPositions = positions.map((position) => {
      return Cesium.Cartographic.fromCartesian(position);
    });

    // 计算多边形面积（使用平面几何）
    const projectedPositions = geographicPositions.map((position) => {
      const longitude = position.longitude;
      const latitude = position.latitude;
      // 使用等距投影简化计算
      // 对于小面积，这种方法精度足够
      const x = position.longitude * 6378137; // 地球半径
      const y = position.latitude * 6378137 * Math.cos(latitude);
      return new Cesium.Cartesian2(x, y);
    });

    let area = 0;
    const n = projectedPositions.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += projectedPositions[i].x * projectedPositions[j].y;
      area -= projectedPositions[j].x * projectedPositions[i].y;
    }
    area = Math.abs(area) / 2;

    return area;
  }

  /**
   * 计算多边形质心
   * @param {Array<Cesium.Cartesian3>} positions - 多边形顶点坐标
   * @returns {Cesium.Cartesian3} - 质心坐标
   * @private
   */
  function _calculatePolygonCentroid(positions) {
    // 简单平均法计算质心 - 对于凸多边形效果较好
    const positionsLength = positions.length;
    let x = 0;
    let y = 0;
    let z = 0;

    for (let i = 0; i < positionsLength; i++) {
      x += positions[i].x;
      y += positions[i].y;
      z += positions[i].z;
    }

    return new Cesium.Cartesian3(
      x / positionsLength,
      y / positionsLength,
      z / positionsLength
    );
  }

  /**
   * 完成测量
   * @private
   */
  function _finishMeasure() {
    if (!state.measuring) return;

    // 保存测量结果为永久实体
    if (state.tempEntities.length > 0) {
      // 将临时实体添加到实体集合
      state.tempEntities.forEach((entity) => {
        // 根据实体类型添加到相应集合
        if (entity && viewer.entities.contains(entity)) {
          if (entity.polygon) {
            entities.areas.push(entity);
          } else if (entity.polyline) {
            entities.lines.push(entity);
          } else if (entity.label) {
            entities.labels.push(entity);
          } else if (entity.point) {
            entities.points.push(entity);
          }
        }
      });

      // 清空临时实体列表但不删除实体
      state.tempEntities = [];
    }

    // 如果启用了连续测量，则保持当前测量类型并清空活动位置
    if (continuousMeasurement) {
      const currentType = state.measureType;
      _resetMeasureState();
      state.measuring = true;
      state.measureType = currentType;
    } else {
      _resetMeasureState();
    }

    // 调用测量完成回调
    if (onMeasureComplete && typeof onMeasureComplete === "function") {
      onMeasureComplete({
        type: state.measureType || "unknown",
      });
    }
  }

  /**
   * 重置测量状态
   * @private
   */
  function _resetMeasureState() {
    state.measuring = false;
    state.measureType = null;
    state.activePositions = [];
    state.activeEntity = null;
    _removeTempEntities();
  }

  /**
   * 开始点位置量测
   */
  function startPointMeasurement() {
    // 停止当前量测
    stopMeasurement();

    // 设置量测状态
    state.measuring = true;
    state.measureType = "point";
    state.activePositions = [];

    // 禁用Cesium默认的双击事件（放大视图）
    _disableDefaultDoubleClick();

    // 创建事件处理器
    _createHandler();

    return "点击地图获取位置信息";
  }

  /**
   * 开始线距离量测
   */
  function startLineMeasurement() {
    // 停止当前量测
    stopMeasurement();

    // 设置量测状态
    state.measuring = true;
    state.measureType = "line";
    state.activePositions = [];

    // 禁用Cesium默认的双击事件（放大视图）
    _disableDefaultDoubleClick();

    // 创建事件处理器
    _createHandler();

    return "点击地图添加线段起点和节点，右键或双击结束测量";
  }

  /**
   * 开始面积量测
   */
  function startAreaMeasurement() {
    // 停止当前量测
    stopMeasurement();

    // 设置量测状态
    state.measuring = true;
    state.measureType = "area";
    state.activePositions = [];

    // 禁用Cesium默认的双击事件（放大视图）
    _disableDefaultDoubleClick();

    // 创建事件处理器
    _createHandler();

    return "点击地图添加多边形顶点，右键或双击结束测量";
  }

  /**
   * 停止当前量测
   */
  function stopMeasurement() {
    // 销毁事件处理器
    _destroyHandler();

    // 恢复Cesium默认的双击事件
    _restoreDefaultDoubleClick();

    // 清空临时实体
    for (const entity of state.tempEntities) {
      if (entity && viewer.entities.contains(entity)) {
        viewer.entities.remove(entity);
      }
    }

    // 重置状态
    state.measuring = false;
    state.measureType = null;
    state.activePositions = [];
    state.activeEntity = null;
    state.tempEntities = [];
  }

  /**
   * 禁用Cesium默认的双击事件
   * @private
   */
  function _disableDefaultDoubleClick() {
    // 存储默认处理器（如果尚未存储）
    if (!defaultDoubleClickAction) {
      defaultDoubleClickAction =
        viewer.cesiumWidget.screenSpaceEventHandler.getInputAction(
          Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
        );
    }

    // 移除默认的双击事件处理
    viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(
      Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
    );
  }

  /**
   * 恢复Cesium默认的双击事件
   * @private
   */
  function _restoreDefaultDoubleClick() {
    // 如果有存储的默认处理器，则恢复它
    if (defaultDoubleClickAction) {
      viewer.cesiumWidget.screenSpaceEventHandler.setInputAction(
        defaultDoubleClickAction,
        Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
      );
    }
  }

  /**
   * 清除所有量测结果
   */
  function clearAll() {
    // 停止当前量测
    stopMeasurement();

    // 清除所有实体
    for (const type in entities) {
      for (const entity of entities[type]) {
        if (entity && viewer.entities.contains(entity)) {
          viewer.entities.remove(entity);
        }
      }
      entities[type] = [];
    }
    
    // 确保活动实体也被清除
    if (state.activeEntity && viewer.entities.contains(state.activeEntity)) {
      viewer.entities.remove(state.activeEntity);
      state.activeEntity = null;
    }

    viewer.entities.removeAll();
  }

  /**
   * 销毁量测工具
   */
  function destroy() {
    clearAll();
    _destroyHandler();
    _restoreDefaultDoubleClick();
  }

  /**
   * 设置是否启用连续测量
   * @param {Boolean} enable - 是否启用连续测量
   */
  function setContinuousMeasurement(enable) {
    continuousMeasurement = enable;
  }

  /**
   * 获取连续测量状态
   * @returns {Boolean} 是否启用连续测量
   */
  function isContinuousMeasurement() {
    return continuousMeasurement;
  }

  /**
   * 设置测量完成回调函数
   * @param {Function} callback - 测量完成时的回调函数，接收参数 {type: 'point'|'line'|'area'}
   */
  function setMeasureCompleteCallback(callback) {
    if (typeof callback === "function") {
      onMeasureComplete = callback;
    }
  }

  // 移除临时实体
  function _removeTempEntities() {
    state.tempEntities.forEach((entity) => {
      if (entity && viewer.entities.contains(entity)) {
        viewer.entities.remove(entity);
      }
    });
    state.tempEntities = [];
    state.activeEntity = null;
  }

  // 返回公共接口
  return {
    /**
     * 开始点位量测
     * @returns {String} - 操作提示信息
     */
    startPointMeasurement: function() {
      // 停止当前测量
      this.stopMeasurement();

      // 创建处理器
      _createHandler();

      // 禁用默认双击事件
      _disableDefaultDoubleClick();

      // 设置状态
      state.measuring = true;
      state.measureType = "point";

      return "点击地图测量点的位置和高度";
    },

    /**
     * 开始线距离量测
     * @returns {String} - 操作提示信息
     */
    startLineMeasurement: function() {
      // 停止当前测量
      this.stopMeasurement();

      // 创建处理器
      _createHandler();

      // 禁用默认双击事件
      _disableDefaultDoubleClick();

      // 设置状态
      state.measuring = true;
      state.measureType = "line";

      return "点击地图添加线段点，双击或右键结束测量";
    },

    /**
     * 开始面积量测
     * @returns {String} - 操作提示信息
     */
    startAreaMeasurement: function() {
      // 停止当前测量
      this.stopMeasurement();

      // 创建处理器
      _createHandler();

      // 禁用默认双击事件
      _disableDefaultDoubleClick();

      // 设置状态
      state.measuring = true;
      state.measureType = "area";

      return "点击地图添加多边形顶点，双击或右键结束测量";
    },

    /**
     * 停止当前量测
     */
    stopMeasurement: function() {
      if (!state.measuring) return;

      // 移除临时实体
      if (state.tempEntities && state.tempEntities.length > 0) {
        for (const entity of state.tempEntities) {
          if (entity && viewer.entities.contains(entity)) {
            viewer.entities.remove(entity);
          }
        }
        state.tempEntities = [];
      }
      
      // 确保活动实体也被清除
      if (state.activeEntity && viewer.entities.contains(state.activeEntity)) {
        viewer.entities.remove(state.activeEntity);
        state.activeEntity = null;
      }
    },

    /**
     * 清除所有测量
     */
    clearAll: function() {
      // 停止当前量测
      this.stopMeasurement();

      // 清除所有实体
      for (const type in entities) {
        for (const entity of entities[type]) {
          if (entity && viewer.entities.contains(entity)) {
            viewer.entities.remove(entity);
          }
        }
        entities[type] = [];
      }
      
      // 额外检查临时实体是否已清除
      if (state.tempEntities && state.tempEntities.length > 0) {
        for (const entity of state.tempEntities) {
          if (entity && viewer.entities.contains(entity)) {
            viewer.entities.remove(entity);
          }
        }
        state.tempEntities = [];
      }
      
      // 确保活动实体也被清除
      if (state.activeEntity && viewer.entities.contains(state.activeEntity)) {
        viewer.entities.remove(state.activeEntity);
        state.activeEntity = null;
      }
    },

    /**
     * 销毁量测工具
     */
    destroy: function() {
      this.clearAll();
      _destroyHandler();
      _restoreDefaultDoubleClick();
    },

    /**
     * 设置是否启用连续测量
     * @param {Boolean} enable - 是否启用连续测量
     */
    setContinuousMeasurement: function(enable) {
      continuousMeasurement = enable;
    },

    /**
     * 获取连续测量状态
     * @returns {Boolean} 是否启用连续测量
     */
    isContinuousMeasurement: function() {
      return continuousMeasurement;
    },

    /**
     * 设置测量完成回调函数
     * @param {Function} callback - 测量完成时的回调函数，接收参数 {type: 'point'|'line'|'area'}
     */
    setMeasureCompleteCallback: function(callback) {
      if (typeof callback === "function") {
        onMeasureComplete = callback;
      }
    }
  };
}

// 导出模块
if (typeof module !== "undefined" && module.exports) {
  module.exports = CesiumMeasurement;
}
