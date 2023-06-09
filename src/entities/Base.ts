import type { Types } from "mongoose";
import { Schema } from "mongoose";

import type { IUser } from "./User";

export interface IBase {
	_id?: Types.ObjectId | string;
	/**
	 * Slug of an item, generated automatically by its "name"
	 */
	slug?: string;
	active?: boolean;
	metadata?: any;
	/**
	 * Owner ID of the app
	 *
	 * @remarks This can be populated to {IUser} data
	 */
	owner?: Types.ObjectId | IUser | string;
	createdAt?: Date;
	deletedAt?: Date;
	updatedAt?: Date;
}

export interface EntityConstructor {
	new (...args: any[]): {};
}

export const baseSchemaDefinitions = {
	slug: { type: String },
	active: { type: Boolean, default: true },
	metadata: { type: Object },
	owner: {
		type: Schema.Types.ObjectId,
		ref: "users",
	},
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now },
	deletedAt: { type: Date },
};
