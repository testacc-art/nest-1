import ksuid from '@cuvva/ksuid';
import { Db } from 'mongodb';
import Squawk from '../utils/squawk';

import Collection from './nest-collection';

export interface Identifier {
	id: string;
	userId: string;
	identifierType: 'email';
	identifierValue: string;
	createdAt: string;
	updatedAt: string | null;
	verifiedAt: string;
	removedAt: string | null;
}

export default class Identifiers extends Collection<Identifier> {
	constructor(db: Db) {
		super(db, 'identifiers');
	}

	async setupIndexes() {
		await Promise.all([
			this.collection.createIndex({
				identifierType: 1,
				identifierValue: 1,
			}),
			this.collection.createIndex({
				identifierType: 1,
				identifierValue: 1,
				removedAt: { $eq: null },
			}, { unique: true }),
		]);
	}

	async createIdentifier(identifierValue: string, identifierType: 'email', userId: string, verified: true) {
		const id = ksuid.generate('userident').toString();
		const now = new Date().toISOString();

		await this.collection.insertOne({
			_id: id,
			identifierType,
			identifierValue,
			userId,
			createdAt: now,
			updatedAt: null,
			verifiedAt: now,
			removedAt: null,
		})
	}

	async setIdentifierAsVerified(id: string) {
		await this.collection.updateOne({ _id: id }, {
			$set: {
				verifiedAt: new Date().toISOString(),
			},
		})
	}

	async findActiveEmailIdentifier(email: string) {
		const identifier = await this.collection.findOne({
			identifierType: 'email',
			identifierValue: email,
		});

		if (!identifier)
			throw new Squawk('not_found');

		return this.convertFromMongoDocument(identifier);
	}

	async findActiveEmailIdentifierByUser(userId: string) {
		const identifier = await this.collection.findOne({
			identifierType: 'email',
			userId: userId,
		});

		if (!identifier)
			throw new Squawk('not_found');

		return this.convertFromMongoDocument(identifier);
	}
}