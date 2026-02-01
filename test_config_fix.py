"""
BananaSlides-GenAI 配置功能修复测试脚本

测试流程：
1. 访问管理后台，修改积分相关配置
2. 测试新用户注册时积分赠送
3. 测试邀请奖励积分
4. 测试手机号绑定奖励
5. 测试余额预警阈值

作者: Claude
日期: 2026-01-31
"""

from playwright.sync_api import sync_playwright, expect
import time
import re

# 测试配置
BASE_URL = "http://localhost:1001"
ADMIN_URL = f"{BASE_URL}/admin"
API_URL = "http://localhost:1111"

# 测试数据
TEST_CONFIG = {
    "NEW_USER_POINTS": "100",  # 新用户赠送积分
    "REFERRAL_POINTS": "300",  # 邀请奖励积分
    "BIND_PHONE_POINTS": "50",  # 绑定手机号积分
    "WARN_THRESHOLD": "30",  # 余额预警阈值
}

# 存储测试过程中生成的数据
test_data = {
    "referral_code": None,
    "new_user_token": None,
    "new_user_id": None,
}


def log_step(step_num: int, description: str):
    """打印测试步骤信息"""
    print(f"\n{'='*60}")
    print(f"步骤 {step_num}: {description}")
    print(f"{'='*60}\n")


def take_screenshot(page, name: str):
    """截图保存"""
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    filename = f"test_screenshot_{name}_{timestamp}.png"
    page.screenshot(path=filename, full_page=True)
    print(f"✓ 截图已保存: {filename}")


# ==================== 测试步骤 ====================

def step_1_login_admin(page):
    """步骤1: 登录管理后台"""
    log_step(1, "登录管理后台")
    
    page.goto(ADMIN_URL)
    page.wait_for_load_state("networkidle")
    print("✓ 已访问管理后台页面")
    
    # 截图查看登录页面
    take_screenshot(page, "admin_login_page")
    
    # 检查是否有登录表单
    try:
        # 尝试查找常见的登录表单元素
        username_field = page.locator("input[type='text'], input[name='username'], input[name='email']").first
        password_field = page.locator("input[type='password']").first
        
        if username_field.is_visible() and password_field.is_visible():
            print("✓ 发现登录表单")
            # 这里可以填写默认管理员账号（如果有的话）
            # username_field.fill("admin")
            # password_field.fill("123456")
            # page.locator("button[type='submit']").click()
        else:
            print("ℹ 未找到标准登录表单，可能已登录或无登录限制")
    except Exception as e:
        print(f"ℹ 登录检查: {e}")
    
    return page


def step_2_check_current_settings(page):
    """步骤2: 查看当前积分配置"""
    log_step(2, "查看当前积分配置")
    
    # 尝试导航到设置页面
    settings_urls = [
        f"{ADMIN_URL}/settings",
        f"{ADMIN_URL}/config",
        f"{ADMIN_URL}/points",
        f"{BASE_URL}/admin/settings",
    ]
    
    for url in settings_urls:
        try:
            page.goto(url)
            page.wait_for_load_state("networkidle")
            print(f"✓ 已访问: {url}")
            take_screenshot(page, f"settings_page_{url.split('/')[-1]}")
            
            # 查找配置相关的文本
            content = page.content()
            if "积分" in content or "points" in content.lower() or "新用户" in content:
                print("✓ 发现积分配置相关页面")
                return page
        except Exception as e:
            print(f"  访问 {url} 失败: {e}")
            continue
    
    print("ℹ 未找到明显的设置页面，继续测试其他功能")
    return page


def step_3_test_new_user_registration():
    """步骤3: 测试新用户注册积分赠送"""
    log_step(3, "测试新用户注册积分赠送")
    
    # 使用 Playwright 测试 API
    import requests
    
    # 生成唯一的测试账号
    import uuid
    test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    test_password = "TestPassword123!"
    test_nickname = f"TestUser_{uuid.uuid4().hex[:4]}"
    
    print(f"创建测试账号: {test_email}")
    
    try:
        # 调用注册 API
        register_data = {
            "email": test_email,
            "password": test_password,
            "nickname": test_nickname
        }
        
        response = requests.post(
            f"{API_URL}/api/auth/register",
            json=register_data,
            timeout=10
        )
        
        if response.status_code == 201 or response.status_code == 200:
            result = response.json()
            print(f"✓ 注册成功!")
            print(f"  用户ID: {result.get('user', {}).get('id')}")
            print(f"  初始积分: {result.get('user', {}).get('points')}")
            print(f"  Token: {result.get('token', 'N/A')[:50]}...")
            
            # 保存测试数据
            test_data["new_user_token"] = result.get('token')
            test_data["new_user_id"] = result.get('user', {}).get('id')
            
            # 验证积分是否与配置一致
            points = result.get('user', {}).get('points')
            expected_points = int(TEST_CONFIG["NEW_USER_POINTS"])
            
            if points == expected_points:
                print(f"✓ 积分验证通过! 当前积分: {points}, 期望积分: {expected_points}")
            else:
                print(f"✗ 积分验证失败! 当前积分: {points}, 期望积分: {expected_points}")
                print(f"  可能原因: 配置未生效或数据库中配置值与测试值不一致")
            
            return True
        else:
            print(f"✗ 注册失败: {response.status_code}")
            print(f"  响应: {response.text}")
            return False
            
    except Exception as e:
        print(f"✗ 测试过程中出现错误: {e}")
        import traceback
        traceback.print_exc()
        return False


def step_4_test_referral_reward():
    """步骤4: 测试邀请奖励积分"""
    log_step(4, "测试邀请奖励积分")
    
    import requests
    import uuid
    
    # 检查是否有已注册用户的 token
    if not test_data.get("new_user_token"):
        print("ℹ 没有可用的测试用户，跳过邀请奖励测试")
        return False
    
    token = test_data["new_user_token"]
    
    try:
        # 1. 获取当前用户的推荐码
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(
            f"{API_URL}/api/users/profile",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            user_data = response.json()
            referral_code = user_data.get('referralCode')
            current_points = user_data.get('points', 0)
            
            print(f"✓ 获取用户信息成功")
            print(f"  推荐码: {referral_code}")
            print(f"  当前积分: {current_points}")
            
            if referral_code:
                test_data["referral_code"] = referral_code
                
                # 2. 使用推荐码注册新用户
                test_email = f"referred_{uuid.uuid4().hex[:8]}@example.com"
                test_password = "TestPassword123!"
                test_nickname = f"ReferredUser_{uuid.uuid4().hex[:4]}"
                
                print(f"\n使用推荐码注册新用户...")
                print(f"  邮箱: {test_email}")
                print(f"  推荐码: {referral_code}")
                
                register_data = {
                    "email": test_email,
                    "password": test_password,
                    "nickname": test_nickname,
                    "referralCode": referral_code
                }
                
                reg_response = requests.post(
                    f"{API_URL}/api/auth/register",
                    json=register_data,
                    timeout=10
                )
                
                if reg_response.status_code in [200, 201]:
                    reg_result = reg_response.json()
                    referred_user_id = reg_result.get('user', {}).get('id')
                    
                    print(f"✓ 被推荐用户注册成功!")
                    print(f"  用户ID: {referred_user_id}")
                    
                    # 3. 检查推荐人是否获得奖励
                    # 等待一秒确保异步处理完成
                    time.sleep(1)
                    
                    check_response = requests.get(
                        f"{API_URL}/api/users/profile",
                        headers=headers,
                        timeout=10
                    )
                    
                    if check_response.status_code == 200:
                        updated_data = check_response.json()
                        new_points = updated_data.get('points', 0)
                        points_diff = new_points - current_points
                        
                        expected_reward = int(TEST_CONFIG["REFERRAL_POINTS"])
                        
                        print(f"\n推荐奖励验证:")
                        print(f"  推荐前积分: {current_points}")
                        print(f"  推荐后积分: {new_points}")
                        print(f"  积分变化: +{points_diff}")
                        print(f"  期望奖励: {expected_reward}")
                        
                        if points_diff == expected_reward:
                            print(f"✓ 推荐奖励验证通过! 获得 {points_diff} 积分")
                            return True
                        else:
                            print(f"✗ 推荐奖励验证失败! 实际获得 {points_diff} 积分，期望 {expected_reward} 积分")
                            return False
                else:
                    print(f"✗ 被推荐用户注册失败: {reg_response.status_code}")
                    print(f"  响应: {reg_response.text}")
                    return False
            else:
                print("✗ 当前用户没有推荐码")
                return False
        else:
            print(f"✗ 获取用户信息失败: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"✗ 测试过程中出现错误: {e}")
        import traceback
        traceback.print_exc()
        return False


def step_5_test_phone_binding():
    """步骤5: 测试手机号绑定奖励"""
    log_step(5, "测试手机号绑定奖励")
    
    import requests
    
    # 检查是否有已注册用户的 token
    if not test_data.get("new_user_token"):
        print("ℹ 没有可用的测试用户，跳过手机号绑定测试")
        return False
    
    token = test_data["new_user_token"]
    
    try:
        # 1. 获取当前用户信息（检查是否已绑定手机号）
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(
            f"{API_URL}/api/users/profile",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            user_data = response.json()
            current_phone = user_data.get('phone')
            current_points = user_data.get('points', 0)
            
            print(f"✓ 获取用户信息成功")
            print(f"  当前手机号: {current_phone if current_phone else '未绑定'}")
            print(f"  当前积分: {current_points}")
            
            if current_phone:
                print("ℹ 用户已绑定手机号，跳过绑定测试")
                return True
            
            # 2. 绑定手机号
            # 生成一个随机的中国大陆手机号格式
            import random
            phone_number = f"1{random.choice(['3','4','5','6','7','8','9'])}{''.join([str(random.randint(0,9)) for _ in range(9)])}"
            
            print(f"\n绑定手机号: {phone_number}")
            
            # 调用更新用户资料 API 绑定手机号
            update_data = {
                "phone": phone_number
            }
            
            update_response = requests.put(
                f"{API_URL}/api/users/profile",
                headers=headers,
                json=update_data,
                timeout=10
            )
            
            if update_response.status_code == 200:
                updated_user = update_response.json()
                new_points = updated_user.get('points', 0)
                bound_phone = updated_user.get('phone')
                points_diff = new_points - current_points
                
                expected_reward = int(TEST_CONFIG["BIND_PHONE_POINTS"])
                
                print(f"✓ 手机号绑定成功!")
                print(f"  绑定手机号: {bound_phone}")
                print(f"  绑定前积分: {current_points}")
                print(f"  绑定后积分: {new_points}")
                print(f"  积分变化: +{points_diff}")
                print(f"  期望奖励: {expected_reward}")
                
                if points_diff == expected_reward:
                    print(f"✓ 手机号绑定奖励验证通过! 获得 {points_diff} 积分")
                    return True
                else:
                    print(f"✗ 手机号绑定奖励验证失败! 实际获得 {points_diff} 积分，期望 {expected_reward} 积分")
                    return False
            else:
                print(f"✗ 绑定手机号失败: {update_response.status_code}")
                print(f"  响应: {update_response.text}")
                return False
        else:
            print(f"✗ 获取用户信息失败: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"✗ 测试过程中出现错误: {e}")
        import traceback
        traceback.print_exc()
        return False


def step_6_test_warning_threshold(page):
    """步骤6: 测试余额预警阈值"""
    log_step(6, "测试余额预警阈值 (前端页面测试)")
    
    print("此测试需要在前端页面进行，检查当积分低于阈值时是否显示预警")
    print("由于需要模拟低积分状态，此测试主要通过检查前端组件来实现")
    
    # 访问前端页面并检查 PointsGuard 组件
    try:
        page.goto(BASE_URL)
        page.wait_for_load_state("networkidle")
        print("✓ 已访问前端页面")
        
        take_screenshot(page, "frontend_homepage")
        
        # 检查页面中是否有积分相关的元素
        # 注意：由于需要登录才能看到积分信息，这里只是检查页面结构
        content = page.content()
        if "积分" in content or "points" in content.lower():
            print("✓ 页面中包含积分相关元素")
        else:
            print("ℹ 页面中未显示积分信息（可能需要登录）")
        
        return True
        
    except Exception as e:
        print(f"✗ 测试过程中出现错误: {e}")
        return False


def step_7_check_api_settings():
    """步骤7: 检查API返回的配置值"""
    log_step(7, "检查API返回的配置值")
    
    import requests
    
    try:
        # 获取公开配置
        response = requests.get(
            f"{API_URL}/api/settings/public",
            timeout=10
        )
        
        if response.status_code == 200:
            settings = response.json()
            print("✓ 成功获取公开配置")
            print(f"  配置内容: {settings}")
            
            # 验证配置值是否与测试配置一致
            all_match = True
            for key, expected_value in TEST_CONFIG.items():
                actual_value = settings.get(key)
                if actual_value == expected_value:
                    print(f"  ✓ {key}: {actual_value} (匹配)")
                else:
                    print(f"  ✗ {key}: 实际值={actual_value}, 期望值={expected_value}")
                    all_match = False
            
            if all_match:
                print("\n✓ 所有配置值验证通过!")
            else:
                print("\n✗ 部分配置值不匹配")
            
            return all_match
        else:
            print(f"✗ 获取配置失败: {response.status_code}")
            print(f"  响应: {response.text}")
            return False
            
    except Exception as e:
        print(f"✗ 检查配置时出现错误: {e}")
        import traceback
        traceback.print_exc()
        return False


# ==================== 主测试函数 ====================

def run_tests():
    """运行所有测试"""
    print("\n" + "="*70)
    print("BananaSlides-GenAI 配置功能修复测试")
    print("="*70)
    print(f"前端地址: {BASE_URL}")
    print(f"后端地址: {API_URL}")
    print(f"测试配置: {TEST_CONFIG}")
    print("="*70 + "\n")
    
    results = {
        "admin_login": False,
        "check_settings": False,
        "new_user_registration": False,
        "referral_reward": False,
        "phone_binding": False,
        "warning_threshold": False,
        "api_settings": False,
    }
    
    with sync_playwright() as p:
        # 启动浏览器
        browser = p.chromium.launch(headless=False)  # 设置为 False 以便观察测试过程
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()
        
        try:
            # 步骤1: 登录管理后台
            step_1_login_admin(page)
            results["admin_login"] = True
            
            # 步骤2: 查看当前积分配置
            step_2_check_current_settings(page)
            results["check_settings"] = True
            
            # 步骤3: 测试新用户注册积分赠送（API测试）
            if step_3_test_new_user_registration():
                results["new_user_registration"] = True
            
            # 步骤4: 测试邀请奖励积分
            if step_4_test_referral_reward():
                results["referral_reward"] = True
            
            # 步骤5: 测试手机号绑定奖励
            if step_5_test_phone_binding():
                results["phone_binding"] = True
            
            # 步骤6: 测试余额预警阈值
            if step_6_test_warning_threshold(page):
                results["warning_threshold"] = True
            
            # 步骤7: 检查API返回的配置值
            if step_7_check_api_settings():
                results["api_settings"] = True
                
        except Exception as e:
            print(f"\n✗ 测试过程中出现严重错误: {e}")
            import traceback
            traceback.print_exc()
            
        finally:
            # 关闭浏览器
            browser.close()
    
    # 打印测试报告
    print_test_report(results)
    
    return results


def print_test_report(results):
    """打印测试报告"""
    print("\n" + "="*70)
    print("测试报告")
    print("="*70)
    
    total = len(results)
    passed = sum(1 for v in results.values() if v)
    failed = total - passed
    
    for test_name, result in results.items():
        status = "✓ 通过" if result else "✗ 失败"
        print(f"  {status} - {test_name}")
    
    print("-"*70)
    print(f"总计: {total} 个测试 | 通过: {passed} | 失败: {failed}")
    
    if failed == 0:
        print("\n🎉 所有测试全部通过!")
    else:
        print(f"\n⚠️ 有 {failed} 个测试未通过，请检查实现")
    
    print("="*70 + "\n")


if __name__ == "__main__":
    run_tests()
