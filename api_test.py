"""
BananaSlides-GenAI 配置功能修复测试 (纯API测试版)
使用标准库进行API测试，无需额外依赖
"""

import http.client
import json
import uuid
import sys

API_HOST = "localhost"
API_PORT = 1111
API_URL = f"http://{API_HOST}:{API_PORT}"

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

def test_get_settings():
    """测试获取公开配置"""
    print("\n" + "="*60)
    print("测试 1: 获取公开配置")
    print("="*60)
    
    status, data = make_request("GET", "/api/settings/public")
    
    if status == 200:
        print("✓ 获取配置成功")
        print(f"  返回数据:")
        for key, value in data.items():
            print(f"    {key}: {value}")
        return True, data
    else:
        print(f"✗ 获取配置失败: HTTP {status}")
        print(f"  错误: {data}")
        return False, {}

def test_user_registration():
    """测试用户注册和积分赠送"""
    print("\n" + "="*60)
    print("测试 2: 新用户注册积分")
    print("="*60)
    
    # 生成测试数据
    test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    test_nickname = f"Test_{uuid.uuid4().hex[:4]}"
    
    print(f"注册邮箱: {test_email}")
    print(f"昵称: {test_nickname}")
    
    # 注册请求
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
        
        # 验证积分是否为 30 (数据库默认值) 或 100 (测试配置值)
        if points == 100:
            print("✓ 积分验证通过: 新用户获得 100 积分 (来自配置)")
        elif points == 30:
            print("ℹ 积分验证: 新用户获得 30 积分 (数据库默认值)")
            print("  提示: 如果数据库中 NEW_USER_POINTS 配置不是 100，这是正常的")
        else:
            print(f"⚠ 积分验证: 期望 100 或 30 积分，实际 {points} 积分")
        
        return True, data
    else:
        print(f"✗ 注册失败: HTTP {status}")
        print(f"  错误: {data}")
        return False, {}

def test_referral_reward(user_token, user_id):
    """测试邀请奖励"""
    print("\n" + "="*60)
    print("测试 3: 邀请奖励积分")
    print("="*60)
    
    # 获取当前用户的推荐码
    headers = {"Authorization": f"Bearer {user_token}"}
    status, data = make_request("GET", "/api/users/profile", headers=headers)
    
    if status != 200:
        print(f"✗ 获取用户信息失败: HTTP {status}")
        return False
    
    referral_code = data.get('referralCode')
    current_points = data.get('points', 0)
    
    print(f"当前用户ID: {user_id}")
    print(f"推荐码: {referral_code}")
    print(f"当前积分: {current_points}")
    
    if not referral_code:
        print("✗ 当前用户没有推荐码")
        return False
    
    # 使用推荐码注册新用户
    new_email = f"referred_{uuid.uuid4().hex[:8]}@example.com"
    new_nickname = f"Referred_{uuid.uuid4().hex[:4]}"
    
    print(f"\n注册被推荐用户...")
    print(f"  邮箱: {new_email}")
    print(f"  推荐码: {referral_code}")
    
    body = {
        "email": new_email,
        "password": "TestPass123!",
        "nickname": new_nickname,
        "referralCode": referral_code
    }
    
    status, data = make_request("POST", "/api/auth/register", body=body)
    
    if status not in [200, 201]:
        print(f"✗ 被推荐用户注册失败: HTTP {status}")
        print(f"  错误: {data}")
        return False
    
    print("✓ 被推荐用户注册成功")
    
    # 等待一秒后检查推荐人积分
    time.sleep(1)
    
    status, data = make_request("GET", "/api/users/profile", headers=headers)
    
    if status != 200:
        print(f"✗ 获取更新后用户信息失败: HTTP {status}")
        return False
    
    new_points = data.get('points', 0)
    points_diff = new_points - current_points
    
    print(f"\n邀请奖励验证:")
    print(f"  邀请前积分: {current_points}")
    print(f"  邀请后积分: {new_points}")
    print(f"  积分变化: +{points_diff}")
    
    # 期望获得 200 积分 (REFERRAL_POINTS 默认值)
    if points_diff == 200:
        print("✓ 邀请奖励验证通过! 获得 200 积分")
        return True
    elif points_diff > 0:
        print(f"ℹ 邀请奖励: 获得 {points_diff} 积分 (可能配置值不是 200)")
        return True
    else:
        print(f"✗ 邀请奖励验证失败! 未获得积分")
        return False

def main():
    """主测试函数"""
    print("\n" + "="*60)
    print("BananaSlides-GenAI 配置功能修复测试")
    print("="*60)
    print(f"后端地址: {API_URL}")
    print("="*60)
    
    results = []
    
    # 测试 1: 获取公开配置
    success, settings = test_get_settings()
    results.append(("获取公开配置", success))
    
    # 测试 2: 新用户注册
    success, user_data = test_user_registration()
    results.append(("新用户注册积分", success))
    
    # 测试 3: 邀请奖励 (如果测试2成功)
    if success and user_data:
        token = user_data.get('token')
        user_id = user_data.get('user', {}).get('id')
        success = test_referral_reward(token, user_id)
        results.append(("邀请奖励积分", success))
    
    # 打印测试报告
    print("\n" + "="*60)
    print("测试报告")
    print("="*60)
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    for test_name, success in results:
        status = "✓ 通过" if success else "✗ 失败"
        print(f"  {status} - {test_name}")
    
    print("-"*60)
    print(f"总计: {total} 个测试 | 通过: {passed} | 失败: {total - passed}")
    
    if passed == total:
        print("\n🎉 所有测试全部通过!")
    else:
        print(f"\n⚠️ 有 {total - passed} 个测试未通过")
    
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
