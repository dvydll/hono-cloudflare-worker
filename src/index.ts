import { Hono } from 'hono';

import type { AppEnv } from 'types';

import { api } from './api';
import { app } from './app';

const cfWorker = new Hono<AppEnv>().route('/api', api).route('/', app);

export default cfWorker;
