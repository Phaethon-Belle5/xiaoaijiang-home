# xiaoaijiang-api Worker

站点后端 Worker：登录鉴权、GitHub OAuth（说说评论）、数据读写（KV）、评论管理、访客计数、RSS。

## ⚠️ 部署必须用 deploy.mjs

```bash
node deploy.mjs
```

**不要用 `wrangler deploy`**：wrangler.toml 里只有 KV binding，
`wrangler deploy` 会把 SITE_PASSWORD / GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET
三个 plain_text binding 覆盖掉，导致管理登录失效（`server_not_configured`）。
2026-08-18 已踩过此坑。

`deploy.mjs` 会自动读取同目录下的本地敏感文件（不入库）：
- `.site_password` —— 管理面板密码
- `.github_client_id` / `.github_client_secret` —— GitHub OAuth

## 端点

| 端点 | 方法 | 说明 |
|---|---|---|
| /login | POST | 管理员登录（SITE_PASSWORD） |
| /logout | POST | 注销 session |
| /oauth/login /callback /me /logout | - | GitHub 登录（评论用） |
| /data, /data/<key> | GET/POST | 站点数据读写（POST 需 session） |
| /comments/<memoId> | GET | 公开读评论 |
| /comments/<memoId> | POST | 发评论（需 GitHub session） |
| /comments/<memoId>/<commentId> | DELETE | 删除评论（需管理员 session） |
| /visit | GET/POST | 访客计数（IP+日期去重） |
| /rss.xml | GET | 说说 RSS |

KV namespace: `STORE` (14330ec39ac64891be778253e78e1cf7)
