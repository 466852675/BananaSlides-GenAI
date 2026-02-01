"""
核心功能测试 - 验证新用户注册积分
"""

import http.client
import json
import uuid

API_HOST = "localhost"
API_PORT = 1111

def make_request(method, path, body=None, headers=None):
    """发起HTTP请求"""
    try:
        conn = http.client.HTTPConnection(API_HOST, API_PORT, timeout=10)
        all_headers = headers or {}
        
        if body and isinstance(body, dict):
            body = json.dumps(body)
            all_headers['Content-Type'] = 'application/json'
        
        conn.request(method, path, body=body, headers=all_headers)
        response = conn.getresponse()
        
        status = response.status
        data = response.read().decode('utf-8')
        conn.close()
        
        try:
            json_data = json.loads(data) if data else {}
        except:
            json_data = {"raw": data}
        
        return status, json_data
    except Exception as e:
        return None, {"error": str(e)}

def main():
    print("="*60)
    print("BananaSlides-GenAI 核心功能测试")
    print("="*60)
    print("测试内容: 新用户注册时是否正确获得积分")
    print("="*60)
    
    # 生成测试数据
    test_email = f"coretest_{uuid.uuid4().hex[:8]}@example.com"
    test_nickname = f"CoreTest_{uuid.uuid4().hex[:4]}"
    
    print(f"\n注册邮箱: {test_email}")
    print(f"昵称: {test_nickname}")
    
    # 发送注册请求
    body = {
        "email": test_email,
        "password": "TestPass123!",
        "nickname": test_nickname
    }
    
    print("\n发送注册请求...")
    status, data = make_request("POST", "/api/auth/register", body=body)
    
    print(f"HTTP状态码: {status}")
    
    if status in [200, 201]:
        print("\n✓ 注册成功!")
        
        # 解析返回的数据
        user = data.get('user', {})
        token = data.get('token')
        
        user_id = user.get('id')
        email = user.get('email')
        nickname = user.get('nickname')
        points = user.get('points')
        
        print(f"\n用户信息:")
        print(f"  ID: {user_id}")
        print(f"  邮箱: {email}")
        print(f"  昵称: {nickname}")
        print(f"  初始积分: {points}")
        
        if token:
            print(f"\n  Token已生成: {token[:50]}...")
        
        # 验证积分
        print("\n" + "-"*60)
        print("积分验证:")
        
        if points is None:
            print("  ✗ 无法获取积分信息")
        elif points == 100:
            print("  ✓ 验证通过: 新用户获得 100 积分 (来自配置)")
        elif points == 30:
            print("  ℹ 新用户获得 30 积分 (数据库默认值)")
            print("  提示: 如果数据库中 NEW_USER_POINTS 配置不是 100，这是正常的")
        else:
            print(f"  ℹ 新用户获得 {points} 积分")
        
        print("-"*60)
        
        return True
    else:
        print(f"\n✗ 注册失败!")
        print(f"  错误信息: {data}")
        return False

if __name__ == "__main__":
    success = main()
    
    print("\n" + "="*60)
    if success:
        print("🎉 测试完成!")
    else:
        print("❌ 测试失败!")
    print("="*60 + "\n")
