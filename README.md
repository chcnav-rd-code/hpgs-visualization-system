# HPGS Visualization System

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

一个高效、易用的HPGS文件和点云数据可视化系统，支持独立加载渲染以及多种数据叠加展示，提供专业量测工具和沉浸式漫游功能助力空间数据分析。

渲染引擎相比 Cesium 原生具有以下优势：

	1	交互体验优化：对模型交互手势进行优化，新增自定义第一人称漫游功能，为用户带来更加流畅、沉浸式的浏览体验，使操作更加灵活便捷。
	2	渲染管线拓展：对原生 3D 模型渲染管线进行拓展，兼容对GaussianSplat 数据深度测试的支持，提升了渲染效果的真实感和准确性，实现基于GS数据的精准量测支持。
	4	叠加渲染与精准量测：成功实现点云与 3D 模型的叠加渲染，并且基于点云数据实现精准量测，满足了复杂场景下多类型数据融合展示与精确测量的需求，提升了数据的利用价值和分析能力。


### 安装
#### 下载完整工程和资源包

从[资源包仓库](https://cocloud-test.obs.cn-east-2.myhuaweicloud.com/temp/hpgs-visualization-systeam.zip)直接下载完整静态资源包、以及测试数据。



## 🌟 功能特点

- **多格式支持**：支持HPGS文件、LAS/LAZ点云数据、3D Tiles等多种格式
- **独立/叠加渲染**：可单独加载HPGS文件，也可与点云数据叠加渲染
- **专业量测工具**：内置点位置、距离、面积测量功能
- **高性能渲染**：基于WebGL，支持大数据量高效渲染
- **沉浸式漫游体验**：支持第一人称视角漫游，包含平滑移动、视角控制
- **适配移动设备**：响应式设计，支持PC和移动端
- **简易集成**：模块化设计，易于集成到现有系统
- **开源可扩展**：基于开源技术栈，高度可定制

## 🚀 快速开始


### 依赖条件

- 现代浏览器支持WebGL (Chrome, Firefox, Edge等)
- Web服务器环境（由于跨域限制，本地直接打开HTML文件可能无法正常工作）

### 项目结构

```
hpgs-visualization-system/
├── js/                        # JavaScript核心功能模块
│   ├── cesium-init.js         # Cesium初始化
│   ├── cesium-load-3dtiles.js # 3D Tiles加载
│   ├── cesium-measurement.js  # 测量工具（基于HPGS）
│   ├── cesium-roaming.js      # Cesium场景漫游
│   ├── potree-init.js         # Potree初始化
│   ├── potree-load-las.js     # 点云数据加载
│   ├── load-transform-matrix.js # 坐标转换矩阵（叠加HPGS+Las）
│   ├── potree-measurement.js  # 点云测量工具
│   └── potree-roaming.js      # 点云场景漫游
│
├── libs/                      # 第三方库文件
│   ├── cesium/               # Cesium引擎库
│   └── potree/               # Potree点云引擎库
│
├── css/                      # 样式文件
│
├── data/                     # 示例数据
│
├── index.html                # HPGS单独渲染示例
├── hpgs_las.html            # HPGS+点云叠加渲染示例
├── package.json             # 项目配置文件
└── README.md                # 项目文档
```

#### 核心模块说明

- **HPGS渲染** - 基于Cesium的3D Tiles加载与渲染，支持大规模三维数据可视化
- **点云处理** - 基于Potree的LAS/LAZ点云数据处理，支持大规模点云高效渲染
- **坐标转换** - 提供HPGS与点云坐标系统转换功能，确保叠加显示时空间对齐
- **测量工具** - 支持三维空间中的点、线、面量测功能，提供专业测量结果
- **漫游控制** - 通用的第一人称视角控制，提供沉浸式场景漫游体验

#### 示例页面功能

- **index.html** - HPGS文件单独加载示例，展示3D Tiles格式渲染能力
- **hpgs_las.html** - HPGS与点云叠加渲染示例，展示多源数据融合显示能力

## 📖 使用指南

### 1. 加载HPGS文件

```html
  <script>
    // 初始化Cesium
    initCesium("cesiumContainer", function (viewer) {
      // 加载HPGS文件（以3D Tiles格式）
      load3Dtiles({
        viewer: viewer,
        url: "https://your-server.com/path/to/tileset.json",
        callback: function (tileset) {
          console.log("HPGS loaded successfully");
        },
        isFlyTo: true  // 自动定位到模型
      });
      
      // 初始化测量工具
      initMeasurementTools(viewer);
    });
  </script>
```

### 2. 加载点云数据

```javascript
// 初始化Potree查看器
initPotree("potree_render_area", function (potreeViewer) {
  // 加载LAS/LAZ点云数据
  loadLas({
    potreeViewer: potreeViewer,
    lasUrl: "https://your-server.com/path/to/pointcloud/metadata.json",
    callback: function (pointcloud) {
      console.log("Point cloud loaded successfully");
    },
    isFlyTo: true  // 自动定位到点云
  });
});
```

### 3. HPGS与点云叠加渲染

```html
  <script>
    // 初始化Cesium和Potree
    initCesium("cesiumContainer", function (cesiumViewer) {
      window.cesiumViewer = cesiumViewer;
      
      // 加载HPGS (3D Tiles)
      load3Dtiles({
        viewer: cesiumViewer,
        url: "https://your-server.com/path/to/hpgs/tileset.json",
        callback: function (tileset) {
          console.log("HPGS loaded successfully");
        },
        isFlyTo: false
      });
      
      // 初始化Potree
      initPotree("potree_render_area", function (potreeViewer) {
        window.potreeViewer = potreeViewer;
        
        // 加载点云
        loadLas({
          potreeViewer: potreeViewer,
          lasUrl: "https://your-server.com/path/to/pointcloud/metadata.json",
          callback: function (pointcloud) {
            // 加载坐标转换矩阵以对齐HPGS和点云
            let tilesetUrl = "https://your-server.com/path/to/hpgs/tileset.json";
            loadTransformMatrix(tilesetUrl);
            
            // 初始化测量工具
            initMeasurementTool();
          },
          isFlyTo: true
        });
      });
    });
    
    // 初始化测量工具
    function initMeasurementTool() {
      // 创建Potree测量工具实例
      var measurement = new PotreeMeasurement(window.potreeViewer);
      
      // 初始化测量工具
      measurement.init({
        continuousMeasurement: false,
        onMeasureComplete: function(result) {
          console.log("测量结果:", result);
        }
      });
      
      window.potreeMeasurement = measurement;
    }
  </script>
```

### 4. 量测工具使用

```javascript
// 获取Cesium查看器实例
var viewer = window.cesiumViewer;

// 初始化测量工具
var measurementTools = initMeasurementTools(viewer);

// 开始点位置测量
measurementTools.startPointMeasurement();

// 开始距离测量
measurementTools.startDistanceMeasurement();

// 开始面积测量
measurementTools.startAreaMeasurement();

// 开始高度测量
measurementTools.startHeightMeasurement();

// 清除所有测量
measurementTools.clearAll();

// 停止当前测量
measurementTools.stopMeasurement();

// 切换测量结果显示单位（米/英尺）
measurementTools.toggleUnitDisplay();

// 启用/禁用测量工具提示
measurementTools.setMeasurementTips(true);
```

### 5. 第一人称漫游控制器

```javascript
// 获取Cesium查看器实例
const viewer = window.cesiumViewer;

// 初始化第一人称漫游控制器
function initFirstPersonRoaming(viewer) {
  // 创建漫游控制器
  const roamingController = new CesiumRoaming(viewer);
  
  // 配置漫游参数
  roamingController.configure({
    moveSpeed: 10,             // 移动速度(米/秒)
    lookSpeed: 0.1,            // 视角旋转速度
    enableCollision: true,     // 是否启用碰撞检测
    minHeight: 1.8,            // 人眼高度(米)
    firstPersonMode: true      // 启用第一人称模式
  });
  
  // 启用漫游控制
  roamingController.enable();
  
  // 添加自定义键盘控制事件
  roamingController.bindCustomKeys({
    // 按F键切换飞行/步行模式
    70: function() { 
      roamingController.toggleFlyMode(); 
    },
    // 按C键重置视角
    67: function() { 
      roamingController.resetView(); 
    }
  });
  
  return roamingController;
}

// 停止漫游并恢复默认控制
function stopRoaming(roamingController) {
  if (roamingController) {
    roamingController.disable();
    // 恢复默认相机控制
    viewer.scene.screenSpaceCameraController.enableRotate = true;
    viewer.scene.screenSpaceCameraController.enableTranslate = true;
    viewer.scene.screenSpaceCameraController.enableZoom = true;
    viewer.scene.screenSpaceCameraController.enableTilt = true;
  }
}
```

## 📝 控制键映射

### 第一人称漫游控制

| 按键 | 功能 |
|------|------|
| W | 前进 |
| S | 后退 |
| A | 左移 |
| D | 右移 |
| Q / C | 下降 |
| E / Z | 上升 |
| I | 向上旋转 |
| K | 向下旋转 |
| J | 左旋转 |
| L | 右旋转 |
| U | 左翻滚 |
| O | 右翻滚 |



## 🔧 API参考

### HPGS加载 (load3Dtiles)

```javascript
load3Dtiles({
  viewer: cesiumViewer,      // Cesium查看器实例
  url: "path/to/tileset.json", // 3D Tiles数据路径
  callback: function(tileset) {}, // 加载完成回调
  isFlyTo: true,             // 是否自动飞行定位
  maximumScreenSpaceError: 16, // 精度控制
  maximumMemoryUsage: 8192    // 内存使用限制(MB)
});
```

### 点云加载 (loadLas)

```javascript
loadLas({
  potreeViewer: potreeViewer, // Potree查看器实例
  lasUrl: "path/to/metadata.json", // 点云元数据路径
  callback: function(pointcloud) {}, // 加载完成回调
  isFlyTo: true,              // 是否自动飞行定位
  pointBudget: 1000000,       // 点云渲染预算
  edlEnabled: true,           // 是否启用EDL(眼部光照)
  material: "RGB"             // 材质类型(RGB/INTENSITY/CLASSIFICATION等)
});
```

### 测量工具 (PotreeMeasurement)

```javascript
// 创建测量工具实例
var measurement = new PotreeMeasurement(potreeViewer);

// 初始化并配置
measurement.init({
  // 是否启用连续测量
  continuousMeasurement: false,
  
  // 按钮ID配置
  pointButtonId: "btn-measure-point",
  distanceButtonId: "btn-measure-distance",
  areaButtonId: "btn-measure-area",
  clearButtonId: "btn-measure-clear",
  stopButtonId: "btn-measure-stop",
  continuousCheckboxId: "chk-continuous-measure",
  
  // 测量开始回调
  onMeasureStart: function(type) {
    console.log("开始测量类型:", type); // 'point', 'distance', 或 'area'
  },
  
  // 测量完成回调
  onMeasureComplete: function(measurement) {
    console.log("测量结果:", measurement);
    // 点测量: {position: {x, y, z}, ...}
    // 距离测量: {distance: value, ...}
    // 面积测量: {area: value, ...}
  }
});

// 方法
measurement.startPointMeasurement();     // 开始点位置测量
measurement.startDistanceMeasurement();  // 开始距离测量
measurement.startAreaMeasurement();      // 开始面积测量
measurement.clearAll();                  // 清除所有测量
measurement.stopMeasurement();           // 停止当前测量
measurement.setContinuousMeasurement(true/false); // 设置连续测量模式
measurement.isContinuousMeasurement();   // 获取连续测量模式状态
measurement.destroy();                   // 销毁测量工具，清理资源
```


## 🔍 问题排查

### HPGS无法正常渲染
1、请确保cesiumjs版本使用项目中的版本master分支的版本。
2、请确认数据的资源链接地址正确。

## 📄 许可证

MIT License

## 📞 联系方式

- 项目维护者: [上海华测导航技术股份有限公司](https://www.huace.cn/)
- 项目主页: [https://github.com/CHCNAV-Official/hpgs-visualization-system](https://github.com/chcnav-rd-code/hpgs-visualization-system/releases)

## 🙏 鸣谢

- [Potree](https://github.com/potree/potree) - WebGL点云渲染库
- [Cesium](https://cesium.com/) - 用于3D地理空间可视化的平台
- [Three.js](https://threejs.org/) - JavaScript 3D库

---

希望本系统能帮助您高效地可视化和分析HPGS文件与点云数据。如有任何问题或建议，欢迎在GitHub上提交issue或直接联系我们。
