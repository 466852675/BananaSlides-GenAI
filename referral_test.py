"""
测试邀请奖励功能
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
    print("BananaSlides-GenAI 邀请奖励功能测试")
    print("="*60)
    
    # 步骤1: 注册第一个用户（作为推荐人）
    print("\n--- 步骤1: 注册推荐人用户 ---")
    referrer_email = f"referrer_{uuid.uuid4().hex[:8]}@example.com"
    referrer_nickname = f"Referrer_{uuid.uuid4().hex[:4]}"
    
    print(f"注册邮箱: {referrer_email}")
    
    body = {
        "email": referrer_email,
        "password": "TestPass123!",
        "nickname": referrer_nickname
    }
    
    status, data = make_request("POST", "/api/auth/register", body=body)
    
    if status not in [200, 201]:
        print(f"✗ 推荐人注册失败: HTTP {status}")
        return
    
    print("✓ 推荐人注册成功")
    
    # 获取 token 和用户信息
    token = data.get('token')
    user = data.get('user', {})
    user_id = user.get('id')
    initial_points = user.get('points')
    
    print(f"  用户ID: {user_id}")
    print(f"  初始积分: {initial_points}")
    
    # 步骤2: 获取推荐码
    print("\n--- 步骤2: 获取推荐码 ---")
    
    headers = {"Authorization": f"Bearer {token}"}
    status, data = make_request("GET", "/api/users/profile", headers=headers)
    
    if status != 200:
        print(f"✗ 获取用户信息失败: HTTP {status}")
        return
    
    referral_code = data.get('referralCode')
    print(f"  推荐码: {referral_code}")
    
    if not referral_code:
        print("✗ 用户没有推荐码")
        return
    
    # 步骤3: 使用推荐码注册新用户
    print("\n--- 步骤3: 使用推荐码注册被推荐用户 ---")
    
    referred_email = f"referred_{uuid.uuid4().hex[:8]}@example.com"
    referred_nickname = f"Referred_{uuid.uuid4().hex[:4]}"
    
    print(f"注册邮箱: {referred_email}")
    print(f"推荐码: {referral_code}")
    
    body = {
        "email": referred_email,
        "password": "TestPass123!",
        "nickname": referred_nickname,
        "referralCode": referral_code
    }
    
    status, data = make_request("POST", "/api/auth/register", body=body)
    
    if status not in [200, 201]:
        print(f"✗ 被推荐用户注册失败: HTTP {status}")
        print(f"  错误: {data}")
        return
    
    print("✓ 被推荐用户注册成功")
    
    # 步骤4: 检查推荐人是否获得奖励
    print("\n--- 步骤4: 验证推荐奖励 ---")
    
    import time
    time.sleep(1)  # 等待奖励处理
    
    status, data = make_request("GET", "/api/users/profile", headers=headers)
    
    if status != 200:
        print(f"✗ 获取更新后用户信息失败: HTTP {status}")
        return
    
    current_points = data.get('points', 0)
    points_diff = current_points - initial_points
    
    print(f"  邀请前积分: {initial_points}")
    print(f"  邀请后积分: {current_points}")
    print(f"  积分变化: +{points_diff}")
    
    # 期望获得 200 积分 (REFERRAL_POINTS 默认值)
    if points_diff == 200:
        print("✓ 邀请奖励验证通过! 获得 200 积分")
    elif points_diff > 0:
        print(f"ℹ 邀请奖励: 获得 {points_diff} 积分")
    else:
        print("✗ 邀请奖励验证失败! 未获得积分")
    
    print("\n" + "="*60)
    print("测试完成")
    print("="*60)

if __name__ == "__main__":
    main()
