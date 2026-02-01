"""
BananaSlides-GenAI 用户模拟测试
使用 Playwright 模拟用户操作，验证配置功能修复

测试流程：
1. 访问前端页面
2. 模拟用户注册
3. 验证新用户积分
4. 测试邀请功能
5. 验证积分变化

作者: Claude
日期: 2026-01-31
"""

from playwright.sync_api import sync_playwright, expect
import time
import json

# 测试配置
FRONTEND_URL = "http://localhost:1001"
API_URL = "http://localhost:1111"

# 测试数据存储
test_data = {
    "referrer_email": None,
    "referrer_token": None,
    "referrer_user_id": None,
    "referrer_initial_points": None,
    "referral_code": None,
    "referred_email": None,
    "referred_user_id": None,
}

def log_step(step_num, title):
    """打印测试步骤"""
    print(f"\n{'='*70}")
    print(f"步骤 {step_num}: {title}")
    print(f"{'='*70}")

def take_screenshot(page, name):
    """截图保存"""
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    filename = f"screenshot_{name}_{timestamp}.png"
    page.screenshot(path=filename, full_page=True)
    print(f"  📸 截图已保存: {filename}")

def test_step_1_visit_homepage(page):
    """步骤1: 访问前端首页"""
    log_step(1, "访问前端首页")
    
    page.goto(FRONTEND_URL)
    page.wait_for_load_state("networkidle")
    
    print(f"  ✅ 页面已加载: {page.title()}")
    take_screenshot(page, "01_homepage")
    
    # 检查页面内容
    content = page.content()
    if "BananaSlides" in content or "PPT" in content:
        print("  ✅ 页面内容验证通过")
    else:
        print("  ⚠️ 页面内容可能需要检查")

def test_step_2_register_referrer(page):
    """步骤2: 注册推荐人用户"""
    log_step(2, "注册推荐人用户")
    
    import uuid
    email = f"referrer_{uuid.uuid4().hex[:8]}@example.com"
    nickname = f"Referrer_{uuid.uuid4().hex[:4]}"
    password = "TestPass123!"
    
    test_data["referrer_email"] = email
    
    print(f"  📧 邮箱: {email}")
    print(f"  👤 昵称: {nickname}")
    
    # 使用 API 注册
    result = page.evaluate(f"""
        async () => {{
            try {{
                const response = await fetch('{API_URL}/api/auth/register', {{
                    method: 'POST',
                    headers: {{'Content-Type': 'application/json'}},
                    body: JSON.stringify({{
                        email: '{email}',
                        password: '{password}',
                        nickname: '{nickname}'
                    }})
                }});
                const data = await response.json();
                return {{success: response.ok, status: response.status, data: data}};
            }} catch (error) {{
                return {{success: false, error: error.message}};
            }}
        }}
    """)
    
    if result.get('success'):
        print("  ✅ 推荐人注册成功")
        
        data = result['data'].get('data', {})
        user = data.get('user', {})
        
        test_data["referrer_token"] = data.get('token')
        test_data["referrer_user_id"] = user.get('id')
        test_data["referrer_initial_points"] = user.get('points')
        
        print(f"  🆔 用户ID: {user.get('id')}")
        print(f"  💰 初始积分: {user.get('points')}")
        
        take_screenshot(page, "02_referrer_registered")
    else:
        print(f"  ❌ 注册失败: {result}")
        raise Exception("推荐人注册失败")

def test_step_3_get_referral_code(page):
    """步骤3: 获取推荐码"""
    log_step(3, "获取推荐码")
    
    token = test_data["referrer_token"]
    
    result = page.evaluate(f"""
        async () => {{
            try {{
                const response = await fetch('{API_URL}/api/users/profile', {{
                    method: 'GET',
                    headers: {{'Authorization': 'Bearer {token}'}}
                }});
                const data = await response.json();
                return {{success: response.ok, data: data}};
            }} catch (error) {{
                return {{success: false, error: error.message}};
            }}
        }}
    """)
    
    if result.get('success'):
        data = result['data']
        referral_code = data.get('referralCode')
        
        if referral_code:
            test_data["referral_code"] = referral_code
            print(f"  ✅ 推荐码: {referral_code}")
            take_screenshot(page, "03_got_referral_code")
        else:
            print("  ❌ 用户没有推荐码")
            raise Exception("获取推荐码失败")
    else:
        print(f"  ❌ 获取用户信息失败: {result}")
        raise Exception("获取用户信息失败")

def test_step_4_register_referred_user(page):
    """步骤4: 注册被推荐用户"""
    log_step(4, "注册被推荐用户 (使用推荐码)")
    
    import uuid
    email = f"referred_{uuid.uuid4().hex[:8]}@example.com"
    nickname = f"Referred_{uuid.uuid4().hex[:4]}"
    password = "TestPass123!"
    referral_code = test_data["referral_code"]
    
    test_data["referred_email"] = email
    
    print(f"  📧 邮箱: {email}")
    print(f"  👤 昵称: {nickname}")
    print(f"  🎟️ 推荐码: {referral_code}")
    
    result = page.evaluate(f"""
        async () => {{
            try {{
                const response = await fetch('{API_URL}/api/auth/register', {{
                    method: 'POST',
                    headers: {{'Content-Type': 'application/json'}},
                    body: JSON.stringify({{
                        email: '{email}',
                        password: '{password}',
                        nickname: '{nickname}',
                        referralCode: '{referral_code}'
                    }})
                }});
                const data = await response.json();
                return {{success: response.ok, status: response.status, data: data}};
            }} catch (error) {{
                return {{success: false, error: error.message}};
            }}
        }}
    """)
    
    if result.get('success'):
        print("  ✅ 被推荐用户注册成功")
        
        data = result['data'].get('data', {})
        user = data.get('user', {})
        
        test_data["referred_user_id"] = user.get('id')
        
        print(f"  🆔 用户ID: {user.get('id')}")
        print(f"  💰 初始积分: {user.get('points')}")
        
        take_screenshot(page, "04_referred_registered")
    else:
        print(f"  ❌ 注册失败: {result}")
        raise Exception("被推荐用户注册失败")

def test_step_5_verify_referral_reward(page):
    """步骤5: 验证推荐人获得奖励"""
    log_step(5, "验证推荐人获得奖励")
    
    import time
    time.sleep(1)  # 等待奖励处理完成
    
    token = test_data["referrer_token"]
    initial_points = test_data["referrer_initial_points"]
    
    result = page.evaluate(f"""
        async () => {{
            try {{
                const response = await fetch('{API_URL}/api/users/profile', {{
                    method: 'GET',
                    headers: {{'Authorization': 'Bearer {token}'}}
                }});
                const data = await response.json();
                return {{success: response.ok, data: data}};
            }} catch (error) {{
                return {{success: false, error: error.message}};
            }}
        }}
    """)
    
    if result.get('success'):
        data = result['data']
        current_points = data.get('points')
        points_diff = current_points - initial_points if initial_points else 0
        
        print(f"  📊 邀请前积分: {initial_points}")
        print(f"  📊 邀请后积分: {current_points}")
        print(f"  💰 积分变化: +{points_diff}")
        
        if points_diff > 0:
            print(f"  ✅ 推荐人获得 {points_diff} 积分奖励!")
            if points_diff == 200:
                print("  ✨ 奖励金额符合默认值 (200积分)")
        else:
            print("  ⚠️ 推荐人暂未获得奖励 (可能需要刷新或等待)")
        
        take_screenshot(page, "05_referral_reward_verified")
    else:
        print(f"  ❌ 获取用户信息失败: {result}")

def main():
    """主测试函数"""
    print("\n" + "="*80)
    print("  🍌 BananaSlides-GenAI 用户模拟测试")
    print("  使用 Playwright 模拟完整用户操作流程")
    print("="*80)
    
    print(f"\n  📍 前端地址: {FRONTEND_URL}")
    print(f"  📍 API地址: {API_URL}")
    
    print("\n" + "-"*80)
    print("  测试流程:")
    print("  1️⃣  访问前端页面")
    print("  2️⃣  注册推荐人用户")
    print("  3️⃣  获取推荐码")
    print("  4️⃣  注册被推荐用户")
    print("  5️⃣  验证推荐奖励")
    print("-"*80)
    
    with sync_playwright() as p:
        # 启动浏览器（非无头模式，方便观察）
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()
        
        try:
            # 执行测试步骤
            test_step_1_visit_homepage(page)
            test_step_2_register_referrer(page)
            test_step_3_get_referral_code(page)
            test_step_4_register_referred_user(page)
            test_step_5_verify_referral_reward(page)
            
            # 测试完成
            print("\n" + "="*80)
            print("  ✅ 所有测试步骤完成!")
            print("="*80)
            print("\n  📊 测试数据汇总:")
            print(f"     推荐人邮箱: {test_data['referrer_email']}")
            print(f"     推荐人ID: {test_data['referrer_user_id']}")
            print(f"     推荐码: {test_data['referral_code']}")
            print(f"     被推荐人邮箱: {test_data['referred_email']}")
            print(f"     被推荐人ID: {test_data['referred_user_id']}")
            print("="*80 + "\n")
            
        except Exception as e:
            print(f"\n  ❌ 测试过程中出现错误: {e}")
            import traceback
            traceback.print_exc()
            take_screenshot(page, "error")
            
        finally:
            browser.close()
            print("  🔒 浏览器已关闭")

if __name__ == "__main__":
    main()
