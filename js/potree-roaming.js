// 相机旋转速度
// var rotateSpeed = Cesium.Math.toRadians(0.8); // 转换为弧度
// 最大移动速度
var maxMoveSpeed = 0.07;
// 加速度
var acceleration = 0.01;
// 减速度/阻尼 - 调整为更快的减速
var damping = 0.65;
// 速度阈值 - 低于此值时直接归零，防止微小漂移
var stopThreshold = 0.02;

// 按键状态跟踪
var keyStates = {
  moveForward: false,
  moveBackward: false,
  moveLeft: false,
  moveRight: false,
  moveUp: false,
  moveDown: false,
  rotateLeft: false,
  rotateRight: false,
  rotateUp: false,
  rotateDown: false,
  rollLeft: false,
  rollRight: false,
};

// 当前速度
var currentVelocity = {
  forward: 0,
  side: 0,
  up: 0,
  rotateX: 0,
  rotateY: 0,
  rotateZ: 0,
};

// 动画帧ID
var animationFrameId = null;

/**
 * 漫游功能
 */
var keyDownFunPotree, keyUpFunPotree;

var KeyCodes = {
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  BOTTOM: 40,
  DELETE: 46,

  A: "A".charCodeAt(0),
  S: "S".charCodeAt(0),
  D: "D".charCodeAt(0),
  W: "W".charCodeAt(0),
  Q: "Q".charCodeAt(0),
  E: "E".charCodeAt(0),
  C: "C".charCodeAt(0),
  Z: "Z".charCodeAt(0),
};

/**
 * 重置所有按键状态和速度
 */
function resetControls() {
  // 重置按键状态
  for (const key in keyStates) {
    keyStates[key] = false;
  }

  // 重置速度
  currentVelocity.forward = 0;
  currentVelocity.side = 0;
  currentVelocity.up = 0;
  currentVelocity.rotateX = 0;
  currentVelocity.rotateY = 0;
  currentVelocity.rotateZ = 0;

  // 取消动画
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

// Potree移动速度和状态
var potreeVelocity = {
  forward: 0,
  side: 0,
  up: 0,
};

function startflyRoamOnPotree() {
  const viewer = window.potreeViewer;
  if (!viewer) {
    return;
  }

  // 切换控制器为第一人称控制器
  if (viewer.setControls) {
    // 记住原来的控制器类型以便退出时恢复
    const originalControl = viewer.controls
      ? viewer.controls.constructor.name
      : null;
    viewer._originalControl = originalControl;
    viewer.setControls(viewer.fpControls);
  }

  // 重置控制状态
  resetControls();

  // 更新相机位置的动画函数
  function updatePotreeCamera() {
    const viewer = window.potreeViewer;

    // 检查viewer是否存在
    if (!viewer) {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      return;
    }

    // 应用阻尼效果
    if (!keyStates.moveForward && !keyStates.moveBackward) {
      potreeVelocity.forward *= damping;
      // 低于阈值时直接停止
      if (Math.abs(potreeVelocity.forward) < stopThreshold) {
        potreeVelocity.forward = 0;
      }
    }
    if (!keyStates.moveLeft && !keyStates.moveRight) {
      potreeVelocity.side *= damping;
      if (Math.abs(potreeVelocity.side) < stopThreshold) {
        potreeVelocity.side = 0;
      }
    }
    if (!keyStates.moveUp && !keyStates.moveDown) {
      potreeVelocity.up *= damping;
      if (Math.abs(potreeVelocity.up) < stopThreshold) {
        potreeVelocity.up = 0;
      }
    }

    // 应用加速度 - 修复W和S方向
    if (keyStates.moveForward) {
      potreeVelocity.forward = Math.min(
        potreeVelocity.forward + acceleration,
        maxMoveSpeed
      );
    }
    if (keyStates.moveBackward) {
      potreeVelocity.forward = Math.max(
        potreeVelocity.forward - acceleration,
        -maxMoveSpeed
      );
    }
    if (keyStates.moveRight) {
      potreeVelocity.side = Math.min(
        potreeVelocity.side + acceleration,
        maxMoveSpeed
      );
    }
    if (keyStates.moveLeft) {
      potreeVelocity.side = Math.max(
        potreeVelocity.side - acceleration,
        -maxMoveSpeed
      );
    }
    if (keyStates.moveUp) {
      potreeVelocity.up = Math.min(
        potreeVelocity.up + acceleration,
        maxMoveSpeed
      );
    }
    if (keyStates.moveDown) {
      potreeVelocity.up = Math.max(
        potreeVelocity.up - acceleration,
        -maxMoveSpeed
      );
    }

    // 移动相机 - 修复前进后退方向
    if (Math.abs(potreeVelocity.forward) > 0.001) {
      // 修改为水平移动
      panForwardHorizontal(-potreeVelocity.forward);
    }

    if (Math.abs(potreeVelocity.side) > 0.001) {
      panLeft(-potreeVelocity.side);
    }

    if (Math.abs(potreeVelocity.up) > 0.001) {
      panUp(potreeVelocity.up);
    }

    // 继续动画循环
    animationFrameId = requestAnimationFrame(updatePotreeCamera);
  }

  // 启动相机更新循环
  animationFrameId = requestAnimationFrame(updatePotreeCamera);

  keyDownFunPotree = (e) => {
    switch (e.keyCode) {
      case KeyCodes.W:
      case KeyCodes.UP:
        keyStates.moveForward = true;
        break;
      case KeyCodes.S:
      case KeyCodes.BOTTOM:
        keyStates.moveBackward = true;
        break;
      case KeyCodes.A:
      case KeyCodes.LEFT:
        keyStates.moveLeft = true;
        break;
      case KeyCodes.D:
      case KeyCodes.RIGHT:
        keyStates.moveRight = true;
        break;
      case KeyCodes.C:
      case KeyCodes.E:
        keyStates.moveUp = true;
        break;
      case KeyCodes.Z:
      case KeyCodes.Q:
        keyStates.moveDown = true;
        break;
    }
  };

  keyUpFunPotree = (e) => {
    switch (e.keyCode) {
      case KeyCodes.W:
      case KeyCodes.UP:
        keyStates.moveForward = false;
        break;
      case KeyCodes.S:
      case KeyCodes.BOTTOM:
        keyStates.moveBackward = false;
        break;
      case KeyCodes.A:
      case KeyCodes.LEFT:
        keyStates.moveLeft = false;
        break;
      case KeyCodes.D:
      case KeyCodes.RIGHT:
        keyStates.moveRight = false;
        break;
      case KeyCodes.C:
      case KeyCodes.E:
        keyStates.moveUp = false;
        break;
      case KeyCodes.Z:
      case KeyCodes.Q:
        keyStates.moveDown = false;
        break;
    }
  };

  document.addEventListener("keydown", keyDownFunPotree);
  document.addEventListener("keyup", keyUpFunPotree);
}

function endflyRoamOnPotree() {
  const viewer = window.potreeViewer;
  if (!viewer) {
    return;
  }

  // 退出时统一改为earthControls
  if (viewer.setControls && viewer.earthControls) {
    viewer.setControls(viewer.earthControls);
  }

  // 取消动画帧并重置控制状态
  resetControls();

  document.removeEventListener("keydown", keyDownFunPotree);
  document.removeEventListener("keyup", keyUpFunPotree);
}

function panForward(distance) {
  const viewer = window.potreeViewer;
  if (!viewer || !viewer.controls || !viewer.controls.scene) return;

  let scene = viewer.controls.scene;
  let panOffset = new THREE.Vector3();

  // 确保camera存在
  const camera = scene.getActiveCamera();
  if (!camera) return;

  let te = camera.matrix.elements;
  panOffset.set(te[8], te[9], te[10]);
  panOffset.multiplyScalar(distance);

  // 确保view存在
  if (!scene.view) return;
  let view = scene.view;
  view.position.add(panOffset);
};

function panLeft(distance) {
  const viewer = window.potreeViewer;
  if (!viewer || !viewer.controls || !viewer.controls.scene) return;

  let scene = viewer.controls.scene;

  // 确保camera存在
  const camera = scene.getActiveCamera();
  if (!camera) return;

  let te = camera.matrix.elements;
  let panOffset = new THREE.Vector3();
  // get X column of matrix
  panOffset.set(te[0], te[1], te[2]);
  panOffset.multiplyScalar(-distance);

  // 确保view存在
  if (!scene.view) return;
  let view = scene.view;
  view.position.add(panOffset);
};

function panUp(distance) {
  const viewer = window.potreeViewer;
  if (!viewer || !viewer.controls || !viewer.controls.scene) return;

  let scene = viewer.controls.scene;

  // 确保camera存在
  const camera = scene.getActiveCamera();
  if (!camera) return;

  let te = camera.matrix.elements;
  let panOffset = new THREE.Vector3();
  panOffset.set(te[4], te[5], te[6]);
  panOffset.multiplyScalar(distance);

  // 确保view存在
  if (!scene.view) return;
  let view = scene.view;
  view.position.add(panOffset);
};

// 添加水平移动方法，确保平行于地面
function panForwardHorizontal(distance) {
  const viewer = window.potreeViewer;
  if (!viewer || !viewer.controls || !viewer.controls.scene) return;

  let scene = viewer.controls.scene;
  let panOffset = new THREE.Vector3();

  // 确保camera存在
  const camera = scene.getActiveCamera();
  if (!camera) return;

  let te = camera.matrix.elements;

  // 获取前向向量
  panOffset.set(te[8], te[9], 0); // z设为0以保持水平移动

  // 归一化向量以保持准确的移动距离
  panOffset.normalize();
  panOffset.multiplyScalar(distance);

  // 确保view存在
  if (!scene.view) return;
  let view = scene.view;
  view.position.add(panOffset);
};
