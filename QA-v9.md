# 《窗外有事》v9 适配验收

验收日期：2026-09-11

## 375×812

- 开场首图使用街面便利店视角，不再出现楼上周奶奶。
- 便签证据区与答题区重叠：0 px。
- ATM 错选停留在 `atm-stop`，可点击“重新判断”。
- 正确取消后按 `private-chat → official-check → evidence-summary` 前进。
- 官方核实仅需一次入口点击，结果页只保留一个后续按钮。
- 无横向滚动，画面容器未发生焦点滚动。

## 320×568

- 便签证据区与答题区重叠：0 px，二者间距约 46 px。
- 顶部标题与进度条完整可见。
- `game.scrollTop` 保持 0，点击证据不会把画面向上推移。
- 官方核实结果、底部按钮与手机画面互不遮挡。
- 无横向滚动；结案页可正常到达。

## 当前单向流程

`opening → observe-note → observe-phone → transition-to-bank → atm-stop → private-chat → official-check → evidence-summary → ending`
