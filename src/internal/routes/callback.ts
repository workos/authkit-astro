import options from 'virtual:@workos/authkit-astro/options';
import { createCallbackHandler } from '../../routes.js';

export const GET = createCallbackHandler({ errorRedirect: options.errorRedirect });
