# 🐱 会说话的汤姆猫 — 养成游戏 Webapp

一个类似《My Talking Tom》的虚拟宠物养成游戏,纯 HTML/CSS/JS 实现,无需构建工具,专为 iPhone 等移动端浏览器优化。

## 🎮 玩法

- **养成照料**:汤姆有饥饿、能量、清洁、心情、如厕 5 项状态,会随时间下降(离线也会!)
  - 🍽️ 厨房:用食物喂它
  - 🛁 浴室:洗澡、上厕所
  - 🛏️ 卧室:关灯让它睡觉恢复能量
  - 🏠 客厅:点它会喵喵叫,按住滑动可以抚摸它
- **🎤 说话复读**:在客厅按住说话按钮录音,松开后汤姆用滑稽的声音复读(需要 HTTPS 和麦克风权限)
- **🎮 小游戏「接食物」**:拖动篮子接住掉落的食物赚金币,小心炸弹!
- **🛒 商店**:用金币购买食物和配饰(领结、帽子)
- **升级系统**:照料和玩耍获得经验,升级奖励金币;每日登录还有奖励

## 🚀 运行

本地预览:

```bash
python3 -m http.server 8000
# 浏览器打开 http://localhost:8000
```

或部署到 GitHub Pages(仓库 Settings → Pages → 选择分支根目录),用 iPhone Safari 打开即玩。麦克风复读功能需要 HTTPS(GitHub Pages 自带)。

## 🛠️ 技术

- 纯 HTML / CSS / JS(ES Modules),零依赖、零构建
- 猫角色为手绘 SVG + CSS keyframe 动画(呼吸、眨眼、摇尾巴、表情)
- 状态存档于 localStorage,支持离线时间结算
- 音效全部由 Web Audio API 合成,无音频资源文件
- 录音采用 ScriptProcessorNode 采集 PCM,兼容 iOS Safari
