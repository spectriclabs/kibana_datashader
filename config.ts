/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const mapConfigSchema = schema.object({
        url: schema.string({ defaultValue: '' }),
        defaultGeospatialField: schema.string({ defaultValue: 'geo_center' }),
        defaultEllipseMajor: schema.string({ defaultValue: 'geo_semimajor_nm' }),
        defaultEllipseMinor: schema.string({ defaultValue: 'geo_semiminor_nm' }),
        defaultEllipseTilt: schema.string({ defaultValue: 'geo_tilt_deg' }),
});

export type DataShaderConfig = TypeOf<typeof mapConfigSchema>;

