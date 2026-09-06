# Fishslop 原始 Prompt 与需求沿革

本文保留需求来源与演变过程；日常开发请使用 [整合版 Prompt](prompt.md)。历史段落中的容量、版本和实现描述反映当时状态，不能覆盖当前代码。

本文归档本项目的原始 prompt、后续补充要求和实际执行背景。原始 prompt 来自用户提供的 `prompt-3d-blender-harder.md` 截图；以下转录仅合并截图中的自动换行，保留原文措辞。中文整理与实现说明单独列出，便于区分需求来源。

## 1. 原始英文 Prompt

```text
I want to make a new game called "fishslop". It is an insaniquarium-style fish feeding game. Instead of clicking to feed, you control a small submarine in the tank and drop food from it. I also want to go 3 dimensional, with the submarine controlling similar to a 3d swimming game like Subnautica but from a 3rd person behind-the-sub perspective.

I have a super rough implementation of a 2d version in the directory ~/Code/experimental-projects/fishgame. I want to use that as a reference, but rebuild it from scratch with a more stable, reliable core.

Take a look at what I have implemented there and help me build something 10x better.

Also:
- Please ONLY read code from this directory and ~/Code/experimental-projects/fishgame, do not check for other implementations on this machine.
- Use whatever technologies you think are best for the task at hand.
- You can reuse assets from the original game or create your own.
- Blender is available for you to use for modeling. I highly recommend using it
```

## 2. 中文需求整理

制作一款名为 **Fishslop** 的 3D 喂鱼游戏，玩法参考《Insaniquarium》：

- 玩家操控水族箱中的小型潜艇，并从潜艇投放鱼食。
- 使用潜艇后方的第三人称视角，支持在三维空间游动；操控感觉参考《Subnautica》这类 3D 水下游戏。
- 参考已有的粗糙 2D 原型，从头重建更稳定、可靠的游戏核心。
- 原型路径为 `~/Code/experimental-projects/fishgame`。
- 代码阅读范围限于当前目录及上述原型目录，不寻找这台机器上的其他实现。
- 技术方案可自行选择；美术资源可复用原型资源，也可原创。
- 可以使用 Blender 建模，原文对此有明确推荐。
- “10x better” 是整体质量提升的愿景，原文没有给出对应的量化验收指标。

## 3. 后续补充要求

以下内容来自同一项目中的后续用户请求，并非原始英文 prompt 的组成部分。

### 按原始 Prompt 执行

用户随后明确要求：

> do as the prompt say

因此，截图中的游戏开发要求成为本项目实际执行的需求。

### 部署到硅谷 VPS

用户要求直接发布到硅谷 VPS，并提供可访问的 Web 链接。

历史版本曾部署至 VPS；公开仓库省略服务器地址。当前发布方式见 [README](../README.md#github-pages-deployment)。

### 对照参考图提升资源品质

用户再次提供游戏画面参考图，并要求：

> 整体资源没有图片这个这么精细和符合实际，重新优化下

参考图用于说明期望的视觉质量：

- 鱼体和尾鳍轮廓更自然，鳍部有可辨识的纹理与细节。
- 潜艇具有清晰的金属、玻璃与机械结构层次。
- 水族箱包含多种珊瑚、海草、岩石和沙底细节。
- 水面、光照与水下焦散形成更完整的水下环境。
- 游戏信息主要位于画面边缘，保留足够的场景展示空间。

以上是对参考图的视觉目标整理，不代表用户指定了某一种建模方法、着色器或界面实现。

### 再次优化场景与潜艇转向

用户提供新的场景参考图，并要求：

> 按照这个再优化下场景。然后移动时潜水艇头没有跟着转动，很死板

本次视觉目标整理为：补充水族箱墙面标识、前景礁石层次、高海草、指状珊瑚与贝壳，让岩石、光照和焦散更柔和。操控目标是让潜艇头随运动方向平滑转动，升降时俯仰、转弯时适度侧倾。具体布局、转向平滑参数和镜头独立跟随方式属于实现选择。

### 水流摇曳与版本提交

用户要求：

> 提交一版，然后水草、珊瑚能跟随水流摇曳吗

在上一版已提交的基础上，为水草、海扇及软珊瑚增加水流摇曳效果，并提交新版本。根部固定、尖端渐弯、水草与珊瑚采用不同摆幅，以及阴影同步，属于本次实现选择。

### 加强鱼尾摆动

用户反馈：

> 鱼的尾巴摇动有点少。

提高尾鳍摆幅和游动频率，随游速平滑变化，并配合小幅身体与胸鳍随动。保持连续动画相位，避免速度改变时尾巴跳动。

### 增加物种、真实比例与性能优化

用户要求：

> 鱼可以做多一些，不同种类，比如鲨鱼、海豚、小丑鱼、水母等等，根据实际大小做。然后整体性能看能不能优化下，现在感觉有点卡顿

增加黑鳍礁鲨、宽吻海豚、小丑鱼和海月水母，依据物种资料选取实际尺寸范围内的代表体型，各自采用对应游动动作。使用近距离观察功能查看小型生物；为现有存档一次性补充居民，并提高容量至 32。通过轻量模型、共享几何和材质、合并绘制、降低阴影和焦散开销及自适应分辨率改善性能。具体数值和基准测试见 README；这些实现方法由开发时选择。

### 从鲸鱼到小型鱼类的体型扩充

用户要求：

> 再加一些各种体型的海洋生物吧，包括大到鲸鱼，小到小型鱼类

本次增加座头鲸、巨型蝠鲼、绿海龟、太平洋沙丁鱼和霓虹虾虎鱼，总计 12 种生物。代表成年尺寸覆盖 5 厘米至 12 米，分别按体长、翼展或背甲长标注。鲸鱼和蝠鲼使用开阔水层，沙丁鱼成群游动；观察模式按体型调整距离并暂时隐藏其他物种，避免大体型遮挡小鱼。容量提升至 48，旧存档一次性增加 12 只居民，并继续验证模型预算和满容量性能。具体物种、尺寸、数量限制与动画方法属于实现选择，资料及测试记录见 README。

### 鲸鱼质感与解剖位置细化

用户反馈鲸鱼整体质感粗糙，尤其是条纹和眼睛的位置。此次将腹部纵向褶沟改成贴合身体的颜色与凹凸纹理，小眼睛放在吻部后方、嘴角上方；重做嘴线、头部结节、长胸鳍与尾叶，并增加克制的皮肤色差和浅色腹部。以侧面、腹面和头部近景核对位置，同时保持原有模型面数预算。具体建模和材质方式属于实现选择。

### 对其余动物逐一检查

用户要求：

> 其他动物也都过一遍

对鲸鱼之外的 11 种动物逐一检查侧面、背面、腹面和游戏内表现。保留检查后合适的原有三种观赏鱼资源；修正其他模型的眼睛、嘴线、鳃缝、尾鳍朝向、薄鳍曲面、海龟盾片及腹甲、水母透明组织、蝠鲼翼面等问题。继续保留真实尺寸设定、存档兼容和模型预算，并记录每个物种的检查结果。详见 README 的 revision 9。

### 亚特兰蒂斯场景（VOL.10）

用户要求：

> 想做个亚特兰蒂斯，能在目前基础上优化吗

在现有玩法基础上改造海底环境：移除鱼缸玻璃和印刷标识，加入可通行的沉没神殿石拱、凹槽柱廊、断柱、台阶、铜绿罗盘、发光遗迹核心与雾中远景城市。保留 12 种生物、原有尺寸、潜艇姿态、投喂与升级、植被水流动画和本地存档。建筑采用共享材质与静态批处理，不新增动态阴影灯；近处主体建筑有简化碰撞，远景仍为布景。上述具体美术和技术方案属于本次实现选择。

### 外围城区无法进入的修复

用户反馈：

> 城堡里面有碰撞墙过不去

进一步确认是“远处建筑进不去”。旧版仍按原鱼缸范围限制移动，外围建筑也只有实心布景。修复将活动范围扩大到 96 × 92 米，把 26 座外围建筑改成可穿行的开放遗迹；石柱、地板和屋顶保留实体碰撞。同步调整镜头范围、雷达比例、鱼群跟随目标和存档位置校验，并逐座验证入口、内部和出口通行。

### 增加鱼群种类和密度

用户要求：

> 鱼群种类和密度可以再增加一些

新增黄高鳍刺尾鱼、蓝倒吊、长鳍蝴蝶鱼和海金鱼，物种数从 12 增至 16；默认居民从 29 增至 72，容量提高至 96。旧存档通过 rosterVersion 3 一次性增加 43 只鱼，保留已有居民、金币和升级。不同鱼群使用分散目标与高度，小型鱼按物种及动画部件进行实例化绘制，保持独立游动和投喂行为。模型尺寸与造型参考资料见 [鱼群扩充记录](shoals.md)。

### 黑夜版本

用户要求：

> 增加黑夜版本

在原场景上增加昼夜切换按钮，首次默认黑夜，独立保存用户的模式选择。夜间使用深蓝海水、月光、较弱焦散、发光微粒和水母，加强潜艇探照灯，给遗迹核心及外围标记增加光感。切换采用平滑过渡，不重置居民、金币、位置或暂停状态。实体碰撞及生物行为沿用现有实现。

### 白天阳光折射

用户要求：

> 白天可以增加太阳光线折射

增强白天的动态焦散：按太阳方向投射水面光纹，随波动缓慢变化，覆盖沙底、岩石、古城石柱和潜艇表面；用表面朝向与水深控制强度。水中加入柔和倾斜光束，合并为一次绘制；昼夜切换时同步减弱，暂停时停止流动。采用风格化着色器近似，不引入实时光线追踪或大量额外灯光。

## 4. 实际执行背景与实现选择

- 原始 prompt 中的 `~/Code/experimental-projects/fishgame` 在本机不存在，因此未能阅读或复用该 2D 原型。
- 项目从描述出发，在当前仓库的 `fishslop/` 目录中独立实现。
- Three.js、Vite、固定时间步模拟、本地存档及程序化海底场景是实施时选择的技术方案，不是原始 prompt 的指定技术栈。
- 鱼的成长、金币、升级、雷达、和平养成规则，以及“10 条鱼、累计收集 500 金币”的阶段目标，是本次实现对喂鱼玩法的具体设计。
- 原创 Blender 建模脚本位于 [`tools/create_assets.py`](../tools/create_assets.py)。模型源文件和运行时 GLB 文件位于 [`public/models/`](../public/models/)。
- 第二版资源包括三种鱼、细化潜艇、鳞片纹理、独立鱼鳍动画，以及更丰富的海底植被和动态焦散；详情见 [README 的视觉更新说明](../README.md#visual-revision-2)。

后续复用此 prompt 时，应先将原型目录替换为实际可用的路径；若没有原型，应明确说明从需求描述开始构建。

## Endless ocean (2026-09-06)

User request (original): “能够做成一个无限空间的海洋”

Implementation scope: retain Atlantis as a home landmark and expand horizontally
with deterministic 48 m ocean chunks. Reuse a fixed 25-chunk pool; stream coral,
kelp, grass and rocks with shared instanced geometry. Remove lateral clamps from
pilot, camera and residents, support remote save positions, shift rendering to a
nearby origin and keep the shoal travelling with the player. Provide local radar,
home direction/distance and a return-home action without resetting progress.
Retain the existing shallow-water depth, feeding loop, daylight and night mode.
Validate old city collision, remote travel/restoration, layout regeneration,
bounded allocation, day/night rendering and returning from distant coordinates.


## Seabed relief (2026-09-06)

User request (original): “海底应该也不是固定的平面”

Replace the moving flat floor with reusable terrain grids. Preserve Atlantis on
a level shelf and gradually introduce dunes, slopes and deeper meandering
channels. Use shared deterministic heights and matching triangle interpolation
for meshes, submarine/camera collision, rock/vegetation placement, fish targets,
food and coins. Support deeper travel and negative-height saves, show clearance
above ground, and verify chunk edges, depth recovery and bounded GPU allocation.
This supersedes the previous iteration's fixed shallow-water floor.


## Oversized shadow correction (2026-09-06)

User request (original): “为什么潜水艇下方有一大片阴影”

A same-view toggle confirmed the transparent water plane inherited shadow casting
from the ordinary mesh helper and acted as a solid roof in the depth pass.
Disable water casting/receiving shadows, retain solid-object shadows, and reduce
the heavy bottom vignette so it does not resemble a large shadow under the pilot.


## Night headlight reach (2026-09-06)

User request (original): “黑夜潜水艇灯光要更亮和更远一些”

Increase night spotlight intensity from 75 to 225 and its range from 20 to 45 m.
Reduce night distance falloff slightly (1.4 to 1.25) and widen the beam half-angle
from 0.48 to 0.52 radians. Blend these settings during day/night transitions;
retain daytime values and reuse the same light without extra shadow passes.
