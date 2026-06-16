# 管理员端后端接口需求

## 🎯 概述

管理员端需要以下8个核心接口，按优先级分为两个阶段开发。

---

## 📋 第一阶段接口（核心功能）

### 1. 班级管理

#### 1.1 获取班级列表
```
GET /api/admin/class-list/
```
**返回：**
```json
{
  "classes": [
    {
      "classid": 1,
      "classname": "计算机科学1班",
      "teacherid": 0,
      "createtime": "2026-03-20 10:30:00",
      "remark": "2024级计算机科学专业1班"
    }
  ]
}
```

#### 1.2 创建班级
```
POST /api/admin/class-create/
```
**请求：**
```json
{
  "className": "计算机科学1班",
  "remark": "2024级计算机科学专业1班"
}
```
**返回：**
```json
{
  "success": true,
  "data": {
    "classid": 1,
    "classname": "计算机科学1班",
    "teacherid": 0,
    "createtime": "2026-03-20 10:30:00",
    "remark": "2024级计算机科学专业1班"
  }
}
```

### 2. 批量导入用户

#### 2.1 批量导入
```
POST /api/admin/bulk-import/
```
**请求：**
```json
{
  "userType": "student",
  "users": [
    {
      "username": "2024001",
      "name": "张三",
      "gender": "男",
      "age": 20,
      "class_name": "计科1班",
      "phone": "13800138000",
      "email": "zhangsan@example.com"
    }
  ]
}
```
**返回：**
```json
{
  "success_count": 10,
  "failed_count": 2,
  "errors": [
    "2024003: 用户名已存在",
    "2024005: 邮箱格式错误"
  ]
}
```

### 3. 学生列表查询

#### 3.1 获取学生列表
```
GET /api/admin/student-list/
```
**返回：**
```json
{
  "students": [
    {
      "studentId": "2024001",
      "name": "张三",
      "gender": "男",
      "age": 20,
      "class": "计科1班",
      "phone": "13800138000",
      "email": "zhangsan@example.com"
    }
  ]
}
```

---

## 📋 第二阶段接口（成绩管理）

### 4. 学生成绩管理

#### 4.1 获取学生成绩
```
GET /api/admin/student-scores/?studentId=2024001
```
**返回：**
```json
{
  "scores": [
    {
      "testid": 1,
      "itemName": "仰卧起坐",
      "score": 85.0,
      "testtime": "2026-03-15 10:30:00"
    },
    {
      "testid": 2,
      "itemName": "引体向上",
      "score": 90.0,
      "testtime": "2026-03-16 14:20:00"
    }
  ]
}
```

#### 4.2 新增成绩
```
POST /api/admin/score-add/
```
**请求：**
```json
{
  "studentId": "2024001",
  "itemName": "仰卧起坐",
  "score": 88.5
}
```
**返回：**
```json
{
  "success": true,
  "message": "成绩添加成功"
}
```

#### 4.3 修改成绩
```
PUT /api/admin/score-update/
```
**请求：**
```json
{
  "testid": 1,
  "score": 92.0
}
```
**返回：**
```json
{
  "success": true,
  "message": "成绩修改成功"
}
```

#### 4.4 删除成绩
```
DELETE /api/admin/score-delete/?testid=1
```
**返回：**
```json
{
  "success": true,
  "message": "成绩删除成功"
}
```

#### 4.5 批量删除学生
```
POST /api/admin/students-delete/
```
**请求：**
```json
{
  "studentIds": ["2024001", "2024002", "2024003"]
}
```
**返回：**
```json
{
  "success": true,
  "message": "已删除 3 位学生"
}
```

---

## 🗄️ 数据库表操作

### 涉及的表：

1. **users** - 用户账号表
   - 操作：INSERT（批量导入时创建账号）
   - 字段：username, password, usertype

2. **student_bulk** - 学生详细信息表
   - 操作：INSERT（批量导入学生信息）
   - 字段：username, name, gender, age, class_name, phone, email

3. **class** - 班级表
   - 操作：SELECT（查询列表）, INSERT（创建班级）
   - 字段：classid, classname, teacherid, createtime, remark, isdeleted

4. **testrecord** - 成绩记录表
   - 操作：SELECT（查询成绩）, INSERT（新增）, UPDATE（修改）, DELETE（删除）
   - 字段：testid, userid, itemid, score, testtime, isdeleted

5. **testitem** - 测试项目表
   - 操作：SELECT（获取项目ID）
   - 字段：itemid, name

### 关联关系：
- `testrecord.userid` → `users.id`
- `testrecord.itemid` → `testitem.itemid`
- `users.username` → `student_bulk.username`

---

## 🔐 权限控制

所有接口需要验证：
1. 用户已登录（JWT Token）
2. 用户角色为 `admin` 或 `manager`

```python
# 示例权限检查
if request.user.usertype not in ['admin', 'manager']:
    return Response({'error': '无权限访问'}, status=403)
```

---

## 📝 后端处理逻辑

### 批量导入用户逻辑：
```python
def bulk_import(request):
    user_type = request.data.get('userType')
    users = request.data.get('users', [])
    
    success_count = 0
    failed_count = 0
    errors = []
    
    for user_data in users:
        try:
            # 1. 创建用户账号
            user = Users.objects.create(
                username=user_data['username'],
                password=make_password('123456'),
                usertype=user_type
            )
            
            # 2. 创建详细信息
            if user_type == 'student':
                BulkStudent.objects.create(
                    username=user_data['username'],
                    name=user_data['name'],
                    # ... 其他字段
                )
            
            success_count += 1
            
        except Exception as e:
            failed_count += 1
            errors.append(f"{user_data['username']}: {str(e)}")
    
    return Response({
        'success_count': success_count,
        'failed_count': failed_count,
        'errors': errors
    })
```

### 成绩查询逻辑：
```python
def get_student_scores(request):
    student_id = request.query_params.get('studentId')
    
    # 1. 获取用户ID
    user = Users.objects.get(username=student_id)
    
    # 2. 查询成绩记录
    records = Testrecord.objects.filter(
        userid=user.id,
        isdeleted=0
    ).order_by('-testtime')
    
    # 3. 关联项目名称
    scores = []
    for record in records:
        item = Testitem.objects.get(itemid=record.itemid)
        scores.append({
            'testid': record.testid,
            'itemName': item.name,
            'score': float(record.score),
            'testtime': record.testtime.strftime('%Y-%m-%d %H:%M:%S')
        })
    
    return Response({'scores': scores})
```

---

## 🚀 开发建议

### 开发顺序：
1. **第一阶段**：班级管理 + 批量导入 + 学生列表
2. **第二阶段**：成绩管理（增删改查）

### 注意事项：
1. 使用软删除（isdeleted字段）而不是物理删除
2. 批量导入时使用数据库事务，失败时回滚
3. 返回友好的错误信息
4. 注意处理用户名重复等异常情况
5. 成绩查询时按时间倒序排列

### 测试建议：
1. 使用 Postman 测试每个接口
2. 测试边界情况（空数据、重复数据、权限不足等）
3. 验证数据库约束和外键关联

---

## 📁 前端文件位置

前端页面已完成，位于：
- `vue-project/src/views/manager/ManagerClassCreate.vue` - 班级管理
- `vue-project/src/views/manager/ManagerUserImport.vue` - 用户导入
- `vue-project/src/views/manager/ManagerUserQuery.vue` - 用户查询

所有页面使用模拟数据，操作时会在浏览器控制台输出API请求信息。

---

## ✅ 接口完成检查清单

### 第一阶段：
- [ ] `GET /api/admin/class-list/` - 班级列表
- [ ] `POST /api/admin/class-create/` - 创建班级
- [ ] `POST /api/admin/bulk-import/` - 批量导入
- [ ] `GET /api/admin/student-list/` - 学生列表

### 第二阶段：
- [ ] `GET /api/admin/student-scores/` - 获取成绩
- [ ] `POST /api/admin/score-add/` - 新增成绩
- [ ] `PUT /api/admin/score-update/` - 修改成绩
- [ ] `DELETE /api/admin/score-delete/` - 删除成绩
- [ ] `POST /api/admin/students-delete/` - 批量删除学生

完成后请通知前端进行接口联调。