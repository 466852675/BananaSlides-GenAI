import { describe, it, expect, beforeAll, afterAll } from 'bun:test';

describe('Refund API Integration Tests', () => {
    const baseUrl = 'http://localhost:3000/api';
    let authToken: string;
    let testOrderId: string;

    beforeAll(async () => {
        // Login to get auth token
        const loginRes = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'test@example.com',
                password: 'testpassword',
            }),
        });
        const loginData = await loginRes.json();
        authToken = loginData.token;
    });

    describe('Complete Refund Flow', () => {
        it('should complete full refund flow: apply -> audit -> complete', async () => {
            // Step 1: Check eligibility
            const eligibilityRes = await fetch(
                `${baseUrl}/orders/${testOrderId}/refund/eligibility`,
                {
                    headers: { Authorization: `Bearer ${authToken}` },
                }
            );
            const eligibility = await eligibilityRes.json();
            expect(eligibility.eligible).toBe(true);

            // Step 2: Apply for refund
            const applyRes = await fetch(
                `${baseUrl}/orders/${testOrderId}/refund`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${authToken}`,
                    },
                    body: JSON.stringify({
                        reason: 'TEST_REFUND',
                        description: 'Integration test refund',
                    }),
                }
            );
            const applyData = await applyRes.json();
            expect(applyData.success).toBe(true);
            const refundId = applyData.refundId;

            // Step 3: Admin audits and approves
            const auditRes = await fetch(
                `${baseUrl}/admin/refunds/${refundId}/audit`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${authToken}`,
                    },
                    body: JSON.stringify({
                        approved: true,
                        remark: 'Integration test approval',
                    }),
                }
            );
            const auditData = await auditRes.json();
            expect(auditData.success).toBe(true);
        });
    });

    describe('Permission Tests', () => {
        it('should reject non-admin access to admin endpoints', async () => {
            const res = await fetch(`${baseUrl}/admin/refunds`, {
                headers: { Authorization: `Bearer ${authToken}` },
            });
            expect(res.status).toBe(403);
        });
    });

    describe('Concurrent Application Prevention', () => {
        it('should prevent duplicate refund applications', async () => {
            // Apply for refund
            await fetch(`${baseUrl}/orders/${testOrderId}/refund`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify({
                    reason: 'TEST_REFUND',
                }),
            });

            // Try to apply again
            const secondRes = await fetch(
                `${baseUrl}/orders/${testOrderId}/refund`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${authToken}`,
                    },
                    body: JSON.stringify({
                        reason: 'TEST_REFUND_2',
                    }),
                }
            );
            const secondData = await secondRes.json();
            expect(secondData.success).toBe(false);
        });
    });
});
