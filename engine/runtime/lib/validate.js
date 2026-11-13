// A small JSON-Schema subset validator shared by Node (template inputs,
// compositions, manifests) and the browser (scene props). No dependencies.
//
// Supported keywords: type (string or array), enum, const, default, minimum,
// maximum, exclusiveMinimum, minLength, maxLength, pattern, items, minItems,
// maxItems, properties, required, additionalProperties (boolean or schema),
// anyOf, description (ignored).
//
// validate(schema, value) → { value, errors }
//   value  = a deep copy with defaults filled in
//   errors = ["path.to.field: must be a number (got \"abc\")", ...]

const typeOf = (v) => {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (Number.isInteger(v)) return 'integer';
  return typeof v;
};

const matchesType = (v, t) => {
  const actual = typeOf(v);
  if (t === 'number') return actual === 'number' || actual === 'integer';
  return actual === t;
};

const show = (v) => {
  let s;
  try { s = JSON.stringify(v); } catch { s = String(v); }
  if (s === undefined) s = String(v);
  return s.length > 60 ? s.slice(0, 57) + '...' : s;
};

const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

function check(schema, value, path, errors) {
  if (!schema || typeof schema !== 'object') return value;
  const at = path || '(root)';

  if (value === undefined) {
    if (schema.default !== undefined) value = clone(schema.default);
    else return value;
  }

  if (schema.anyOf) {
    for (const sub of schema.anyOf) {
      const subErrors = [];
      const out = check(sub, clone(value), path, subErrors);
      if (!subErrors.length) return out;
    }
    errors.push(`${at}: does not match any allowed form (got ${show(value)})`);
    return value;
  }

  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => matchesType(value, t))) {
      errors.push(`${at}: must be ${types.join(' or ')} (got ${typeOf(value)} ${show(value)})`);
      return value;
    }
  }

  if (schema.const !== undefined && value !== schema.const) {
    errors.push(`${at}: must be ${show(schema.const)} (got ${show(value)})`);
  }
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${at}: must be one of ${schema.enum.map(show).join(', ')} (got ${show(value)})`);
  }

  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${at}: must be >= ${schema.minimum} (got ${value})`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${at}: must be <= ${schema.maximum} (got ${value})`);
    if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) errors.push(`${at}: must be > ${schema.exclusiveMinimum} (got ${value})`);
  }

  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(schema.minLength === 1 ? `${at}: must not be empty` : `${at}: must be at least ${schema.minLength} characters (got ${value.length})`);
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) errors.push(`${at}: must be at most ${schema.maxLength} characters (got ${value.length})`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) errors.push(`${at}: must match /${schema.pattern}/ (got ${show(value)})`);
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${at}: must have at least ${schema.minItems} item(s) (got ${value.length})`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${at}: must have at most ${schema.maxItems} item(s) (got ${value.length})`);
    if (schema.items) value = value.map((item, i) => check(schema.items, item, `${path}[${i}]`, errors));
  }

  if (typeOf(value) === 'object') {
    const props = schema.properties || {};
    for (const key of schema.required || []) {
      if (value[key] === undefined && props[key]?.default === undefined) {
        errors.push(`${path ? path + '.' : ''}${key}: is required`);
      }
    }
    const out = {};
    for (const [key, v] of Object.entries(value)) {
      const sub = props[key];
      const p = path ? `${path}.${key}` : key;
      if (sub) out[key] = check(sub, v, p, errors);
      else if (schema.additionalProperties === false) {
        const known = Object.keys(props);
        const near = known.find((k) => k.toLowerCase() === key.toLowerCase() || editDistance(k, key) <= 2);
        errors.push(`${p}: unknown field${near ? ` (did you mean "${near}"?)` : ''}`);
      } else if (typeof schema.additionalProperties === 'object') {
        out[key] = check(schema.additionalProperties, v, p, errors);
      } else out[key] = v;
    }
    for (const [key, sub] of Object.entries(props)) {
      if (out[key] === undefined && sub.default !== undefined) out[key] = clone(sub.default);
    }
    return out;
  }

  return value;
}

function editDistance(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 99;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

export function validate(schema, value, path = '') {
  const errors = [];
  const out = check(schema, clone(value), path, errors);
  return { value: out, errors };
}
