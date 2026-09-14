# 《窗外有事》v8 实际点击验收记录

验收视口：375×812、320×568。两套尺寸均从声音入口进入，并实际点击到结案；375×812 覆盖 ATM 错选与重选，320×568 额外检查按钮边界、横向溢出和便签文字遮挡。

| 状态名 | 实际背景资源 | 主要按钮文字 |
| --- | --- | --- |
| `opening` | `01-rainy-evening-street.webp` → `02-store-closing-broken-freezer.webp` → `03-card-note-phone-closeup.webp` → `04-message-over-shoulder.webp` → `05-grandma-observes-through-window.webp` | 跳过开场 |
| `observe-note` | `05-grandma-observes-through-window.webp` → `07-personal-payee-note-closeup.webp` | 无数字放大镜；便签纸看起来有些旧；对方要求转到个人账户 |
| `observe-phone` | `05-grandma-observes-through-window.webp` → `08-pressure-message-closeup.webp` → `05-grandma-observes-through-window.webp` | 无数字放大镜；请在九点前完成解冻；请勿联系平台客服；赶紧跟上 |
| `transition-to-bank` | `09-uncle-leaves-store-in-rain.webp` → `10-grandma-follows-to-atm.webp` → `16-atm-action-choice-v2.webp` | 无，自动播放 3 段动作 |
| `atm-stop` | `16-atm-action-choice-v2.webp` → `17b-cancel-and-take-card.webp` → `20a-card-safe-closeup.webp` | 继续按对方说的转账；取消操作，先把银行卡取回来；重新判断 |
| `private-chat` | `18-official-customer-service.webp` | 回原申请 App 核实 |
| `official-home` | `18-official-customer-service.webp` | 申请记录 |
| `official-record` | `18-official-customer-service.webp` | 查看费用 |
| `official-fee` | `18-official-customer-service.webp` | 咨询官方客服 |
| `official-service` | `18-official-customer-service.webp` | 对照两边说法 |
| `evidence-summary` | `15a-reaction-after-verification.webp` | 查看结案 |
| `ending` | `20-case-closed-background.webp` | 再看一遍 |

验收结果：开场结束后保持同一便利店画面进入观察；没有数字热点；ATM 停止发生在官方核实之前；点击“咨询官方客服”立即进入客服回复；官方核实只发生一次；客服之后只进入证据对照与结案，没有返回 ATM；两套视口均无横向溢出和页面脚本错误。
