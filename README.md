# 《白昼市侦探社》第一关《窗外有事》互动 Demo

竖屏反诈互动叙事原型，沿用“奶奶侦探”成人向手绘风格。

## 流程

- 开场只演到周奶奶隔窗发现异常，何叔离店与追赶移到观察之后
- 2 个按顺序解锁的风险判断：放大证据、阅读内容、选择风险点
- 目标只显示小放大镜，使用大范围点击区，不再显示 1/2/3 编号
- 答错不扣分、不推进，解释后可立即重选
- 观察结果明确收束为“个人账户 + 阻止官方核实 = 高风险”
- 观察后连续展示何叔离店、周奶奶追赶与 ATM 前叫停
- 先取消 ATM 操作并收好银行卡，再查看陌生私聊与官方 App
- 官方 App 依次查看申请、费用与客服回复，核实只发生一次
- 客服回复后对照陌生说法与官方结果，再进入结案
- 错选只给风险反馈并允许重新判断，不产生真实转账结果
- 声音入口、全程静音开关、跳过与重播状态重置

单向状态：`opening → observe-note → observe-phone → transition-to-bank → atm-stop → private-chat → official-home → official-record → official-fee → official-service → evidence-summary → ending`。

## 本地查看

用任意静态文件服务器打开 `dist/` 目录即可。入口为 `dist/index.html`。

## GitHub Pages

仓库已包含 GitHub Pages 自动部署流程。推送到 `main` 后，工作流会直接发布
`dist/` 中的静态页面，无需额外构建。
