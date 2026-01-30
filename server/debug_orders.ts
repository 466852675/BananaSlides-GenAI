
import { listOrders } from './src/services/order.service';

async function test() {
    try {
        console.log('Testing listOrders with empty filters...');
        const result = await listOrders({}, { page: 1, limit: 20 });
        console.log('Success!', result.orders.length, 'orders found.');
    } catch (error) {
        console.error('FAILED with error:');
        console.error(error);
    }
}

test();
