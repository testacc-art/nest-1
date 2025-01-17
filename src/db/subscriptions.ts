import ksuid from '@cuvva/ksuid';
import { Db } from 'mongodb';

import Collection, { MongoDocument } from './nest-collection';

export type CancelType = 'immediate' | 'period_end';

export interface Subscription {
	id: string;
	userId: string;
	stpProductId: string;
	stpSubscriptionId: string;
	stpCustomerId: string;
	startsAt: string;
	endsAt: string;
	status: string;
	cancelAt: string | null;
	cancelType: CancelType | null;
	createdAt: string;
	updatedAt: string | null;
	cancelledAt: string | null;
}

export interface SubscriptionDelta {
	startsAt?: string;
	endsAt?: string;
	status?: string;
	cancelAt?: string | null;
	cancelType?: CancelType | null;
	cancelledAt?: string | null;
}

export default class Subscriptions extends Collection<Subscription> {
	constructor(db: Db) {
		super(db, 'subscriptions');
	}

	async setupIndexes() {
		await this.collection.createIndex({ stpSubscriptionId: 1 }, { unique: true });
	}

	async createSubscription(
		userId: string,
		stpProductId: string,
		stpSubscriptionId: string,
		stpCustomerId: string,
		startsAt: string,
		endsAt: string,
		status: string,
	) {
		const now = new Date().toISOString();

		await this.collection.insertOne({
			_id: ksuid.generate('sub').toString(),
			userId,
			stpProductId,
			stpSubscriptionId,
			stpCustomerId,
			startsAt,
			endsAt,
			cancelAt: null,
			status,
			createdAt: now,
			updatedAt: null,
			cancelledAt: null,
			cancelType: null,
		});
	}

	async updateSubscription(id: string, delta: SubscriptionDelta) {
		await this.collection.updateOne({ _id: id }, {
			$set: {
				...delta,
				updatedAt: new Date().toISOString(),
			},
		});
	}

	async findActiveSubscription(userId: string) {
		const now = new Date().toISOString();

		const subscription = await this.collection.findOne({
			userId,
			status: { $in: ['active', 'incomplete'] },
			// @ts-expect-error
			endsAt: { $ne: null, $gt: now },
		}) as unknown as MongoDocument<Subscription>;

		if (subscription === null)
			return null;

		return this.convertFromMongoDocument(subscription);
	}

	async findByStripeId(id: string) {
		const subscription = await this.collection.findOne({ stpSubscriptionId: id });

		if (subscription === null)
			return null;

		return this.convertFromMongoDocument(subscription);
	}
}
