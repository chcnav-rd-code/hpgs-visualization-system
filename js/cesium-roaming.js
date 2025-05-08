/**
 * Cesium漫游控制模块
 * 提供第一人称漫游功能，包括键盘控制移动和旋转
 * 
 * @param {Cesium.Viewer} viewer - Cesium Viewer实例
 * @param {Object} options - 配置选项
 * @param {Number} options.moveSpeed - 移动速度，默认0.1
 * @param {Number} options.rotateSpeed - 旋转速度（弧度），默认1度
 * @returns {Object} - 漫游控制器对象
 */
function CesiumRoaming(viewer, options = {}) {
  const camera = viewer.camera;
  let moveSpeed = options.moveSpeed || 0.1;
  let rotateSpeed = options.rotateSpeed || Cesium.Math.toRadians(1);

  // 初始化键盘按下状态跟踪对象
  const keysDown = {};
  const lastKeyState = {};
  
  let animationFrameId = null;
  
  // 键盘映射说明
  const keyMappings = {
    // 移动控制
    87: 'W - 向前移动',
    83: 'S - 向后移动',
    65: 'A - 向左移动',
    68: 'D - 向右移动',
    81: 'Q - 向下移动',
    69: 'E - 向上移动',
    // 视角控制
    73: 'I - 向上旋转 (Pitch Up)',
    75: 'K - 向下旋转 (Pitch Down)',
    74: 'J - 左旋转 (Yaw 左)',
    76: 'L - 右旋转 (Yaw 右)',
    85: 'U - 左翻滚 (Roll Left)',
    79: 'O - 右翻滚 (Roll Right)'
  };
  
  /**
   * 键盘按下事件处理
   * @param {KeyboardEvent} e - 键盘事件
   * @private
   */
  function _onKeyDown(e) {
    keysDown[e.keyCode] = true;
    console.log('按键按下: ' + e.key + ' (键码: ' + e.keyCode + ')');
  }
  
  /**
   * 键盘释放事件处理
   * @param {KeyboardEvent} e - 键盘事件
   * @private
   */
  function _onKeyUp(e) {
    keysDown[e.keyCode] = false;
    console.log('按键释放: ' + e.key + ' (键码: ' + e.keyCode + ')');
  }
  
  /**
   * 更新相机位置和方向
   * @private
   */
  function _updateCamera() {
    var cameraDirection = camera.direction;
    var cameraRight = camera.right;
    var cameraUp = camera.up;
    
    // 移动相机（基于当前朝向）
    if (keysDown[87]) { // W - 向前
      camera.move(cameraDirection, moveSpeed);
    }
    if (keysDown[83]) { // S - 向后
      camera.move(cameraDirection, -moveSpeed);
    }
    if (keysDown[65]) { // A - 向左
      camera.move(cameraRight, -moveSpeed);
    }
    if (keysDown[68]) { // D - 向右
      camera.move(cameraRight, moveSpeed);
    }
    if (keysDown[81]) { // Q - 向下
      camera.move(cameraUp, -moveSpeed);
    }
    if (keysDown[69]) { // E - 向上
      camera.move(cameraUp, moveSpeed);
    }
    
    // 旋转相机
    if (keysDown[74]) { // J - 左旋转 (Yaw 左)
      camera.setView({
        orientation: {
          heading: camera.heading - rotateSpeed,
          pitch: camera.pitch,
          roll: camera.roll,
        },
      });
    }
    if (keysDown[76]) { // L - 右旋转 (Yaw 右)
      camera.setView({
        orientation: {
          heading: camera.heading + rotateSpeed,
          pitch: camera.pitch,
          roll: camera.roll,
        },
      });
    }
    if (keysDown[73]) { // I - 向上旋转 (Pitch Up)
      camera.setView({
        orientation: {
          heading: camera.heading,
          pitch: Cesium.Math.clamp(
            camera.pitch + rotateSpeed,
            -Cesium.Math.PI_OVER_TWO,
            Cesium.Math.PI_OVER_TWO
          ),
          roll: camera.roll,
        },
      });
    }
    if (keysDown[75]) { // K - 向下旋转 (Pitch Down)
      camera.setView({
        orientation: {
          heading: camera.heading,
          pitch: Cesium.Math.clamp(
            camera.pitch - rotateSpeed,
            -Cesium.Math.PI_OVER_TWO,
            Cesium.Math.PI_OVER_TWO
          ),
          roll: camera.roll,
        },
      });
    }
    if (keysDown[85]) { // U - 左翻滚 (Roll Left)
      camera.setView({
        orientation: {
          heading: camera.heading,
          pitch: camera.pitch,
          roll: camera.roll - rotateSpeed,
        },
      });
    }
    if (keysDown[79]) { // O - 右翻滚 (Roll Right)
      camera.setView({
        orientation: {
          heading: camera.heading,
          pitch: camera.pitch,
          roll: camera.roll + rotateSpeed,
        },
      });
    }
    
    // 继续下一帧更新
    animationFrameId = requestAnimationFrame(_updateCamera);
  }
  
  /**
   * 添加键盘事件监听
   * @private
   */
  function _addEventListeners() {
    document.addEventListener('keydown', _onKeyDown);
    document.addEventListener('keyup', _onKeyUp);
  }
  
  /**
   * 移除键盘事件监听
   * @private
   */
  function _removeEventListeners() {
    document.removeEventListener('keydown', _onKeyDown);
    document.removeEventListener('keyup', _onKeyUp);
  }
  
  // 初始化：添加事件监听并启动相机更新循环
  _addEventListeners();
  animationFrameId = requestAnimationFrame(_updateCamera);
  
  // 返回漫游控制器公共接口
  return {
    /**
     * 设置移动速度
     * @param {Number} speed - 新的移动速度
     */
    setMoveSpeed: function(speed) {
      moveSpeed = speed;
    },
    
    /**
     * 设置旋转速度（弧度）
     * @param {Number} speed - 新的旋转速度（弧度）
     */
    setRotateSpeed: function(speed) {
      rotateSpeed = speed;
    },
    
    /**
     * 获取键盘映射说明
     * @returns {Object} 键盘映射对象
     */
    getKeyMappings: function() {
      return {...keyMappings};
    },
    
    /**
     * 销毁漫游控制器，移除事件监听
     */
    destroy: function() {
      _removeEventListeners();
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      // 清除按键状态
      for (let key in keysDown) {
        keysDown[key] = false;
      }
    }
  };
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CesiumRoaming;
} 