## 任务完成：新增短信发送记录 API

### 1. 新增的 API 路由路径
`GET /api/v2/admin/users/:user/sms-records`

### 2. 新增文件
- DTO: `src/module/user/dto/sms-records.dto.ts`
- Controller 方法已添加到 `admin-user.controller.ts`

### 3. 关键代码
```typescript
@Get('/:user/sms-records')
@Role(RoleType.ADMIN, RoleType.ROOT)
async listUserSmsRecords(@Param('user') user: string, @Query() dto: SmsRecordsReqDto)
```
- 从 alarm-setup 获取用户手机号过滤
- 支持 page, pageSize, start, end 参数
- 返回按 createdAt 倒序的分页记录

### 4. 返回格式
```json
{ "code": 200, "data": { "items": [...], "pagination": { page, pageSize, total } } }
```

### 5. 无需其他修改