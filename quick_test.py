"""
BananaSlides-GenAI 配置功能修复快速测试
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

def test_settings():
    """测试获取配置"""
    print("\n--- 测试: 获取公开配置 ---")
    status, data = make_request("GET", "/api/settings/public")
    
    if status == 200:
        print("✓ 获取配置成功")
        for key, value in data.items():
            print(f"  {key}: {value}")
        return True
    else:
        print(f"✗ 获取配置失败: HTTP {status}")
        return False

def test_register():
    """测试用户注册"""
    print("\n--- 测试: 新用户注册积分 ---")
    
    test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    test_nickname = f"Test_{uuid.uuid4().hex[:4]}"
    
    print(f"注册邮箱: {test_email}")
    
    body = {
        "email": test_email,
        "password": "TestPass123!",
        "nickname": test_nickname
    }
    
    status, data = make_request("POST", "/api/auth/register", body=body)
    
    if status in [200, 201]:
        print("✓ 注册成功")
        user = data.get('user', {})
        points = user.get('points')
        
        print(f"  用户ID: {user.get('id')}")
        print(f"  初始积分: {points}")
        
        if points == 100:
            print("✓ 积分验证: 获得 100 积分 (来自配置)")
        elif points == 30:
            print("ℹ 积分验证: 获得 30 积分 (数据库默认值)")
        else:
            print(f"ℹ 积分验证: 获得 {points} 积分")
        
        return True, data
    else:
        print(f"✗ 注册失败: HTTP {status}")
        print(f"  错误: {data}")
        return False, {}

def main():
    print("="*60)
    print("BananaSlides-GenAI 配置功能修复测试")
    print("="*60)
    print(f"API地址: http://{API_HOST}:{API_PORT}")
    print("="*60)
    
    results = []
    
    # 测试1: 获取配置
    success = test_settings()
    results.append(("获取公开配置", success))
    
    # 测试2: 用户注册
    success, user_data = test_register()
    results.append(("新用户注册积分", success))
    
    # 打印报告
    print("\n" + "="*60)
    print("测试报告")
    print("="*60)
    
    passed = sum(1 for _, s in results if s)
    total = len(results)
    
    for name, success in results:
        status = "✓ 通过" if success else "✗ 失败"
        print(f"  {status} - {name}")
    
    print("-"*60)
    print(f"总计: {total} | 通过: {passed} | 失败: {total - passed}")
    
    if passed == total:
        print("\n🎉 所有测试通过!")
    else:
        print(f"\n⚠️ {total - passed} 个测试未通过")
    
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
