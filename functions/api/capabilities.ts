import { json, serviceFor, type PagesContext } from './_shared';

export const onRequestGet = ({ env }: PagesContext) => json(serviceFor(env).capabilities);
