import {paymentPage} from '../payment-ui';
await Bun.write('/tmp/ad507-commercial-fixture.html',paymentPage('11111111-1111-4111-8111-111111111111','test'));
