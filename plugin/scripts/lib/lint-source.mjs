function blankRange(characters, start, end) {
  for (let index = start; index < end; index++) {
    if (characters[index] !== '\n' && characters[index] !== '\r') characters[index] = ' ';
  }
}

function blankText(source) {
  return source.replace(/[^\r\n]/g, ' ');
}

/** Mask comments and literal text while retaining executable template expressions. */
export function scanCode(source, offset = 0, css = false) {
  const code = source.split('');
  const commentFree = source.split('');
  const literals = [];

  function maskComment(start, end) {
    blankRange(code, start, end);
    blankRange(commentFree, start, end);
    return end;
  }

  function quoted(start) {
    const quote = source[start];
    let end = start + 1;
    while (end < source.length) {
      if (source[end] === '\\') end += 2;
      else if (source[end++] === quote) break;
    }
    end = Math.min(end, source.length);
    const value = source.slice(start + 1, end - 1).replace(/\\(['"\\/])/g, '$1');
    literals.push({ start: start + offset, end: end + offset, value, quote });
    blankRange(code, start, end);
    return end;
  }

  function template(start) {
    blankRange(code, start, start + 1);
    let index = start + 1;
    while (index < source.length) {
      if (source[index] === '\\') {
        blankRange(code, index, index + 2);
        index += 2;
      } else if (source[index] === '$' && source[index + 1] === '{') {
        blankRange(code, index, index + 1);
        index = executable(index + 2, true);
      } else if (source[index] === '\x60') {
        blankRange(code, index, index + 1);
        literals.push({
          start: start + offset, end: index + 1 + offset,
          value: source.slice(start + 1, index), quote: '\x60',
        });
        return index + 1;
      } else {
        blankRange(code, index, index + 1);
        index++;
      }
    }
    return index;
  }

  function executable(start, stopAtBrace = false) {
    let depth = 0;
    let index = start;
    while (index < source.length) {
      const pair = source.slice(index, index + 2);
      if (pair === '/*') {
        const close = source.indexOf('*/', index + 2);
        index = maskComment(index, close < 0 ? source.length : close + 2);
      } else if (!css && pair === '//') {
        const close = source.indexOf('\n', index + 2);
        index = maskComment(index, close < 0 ? source.length : close);
      } else if (source[index] === '"' || source[index] === "'") {
        index = quoted(index);
      } else if (!css && source[index] === '\x60') {
        index = template(index);
      } else if (source[index] === '{') {
        depth++;
        index++;
      } else if (source[index] === '}' && stopAtBrace && depth === 0) {
        return index + 1;
      } else {
        if (source[index] === '}') depth--;
        index++;
      }
    }
    return index;
  }

  executable(0);
  return { code: code.join(''), commentFree: commentFree.join(''), literals };
}

function restoreGuardLiterals(code, literals) {
  const characters = code.split('');
  for (const literal of literals) {
    if (!/^(?:[?&])?t=?$/.test(literal.value)) continue;
    const text = literal.quote + literal.value + literal.quote;
    for (let index = 0; index < text.length; index++) {
      characters[literal.start + index] = text[index];
    }
  }
  return characters.join('');
}

function moduleUrls(code, literals) {
  return literals.filter(literal => {
    if (!/^https?:\/\//i.test(literal.value)) return false;
    const prefix = code.slice(0, literal.start);
    return /\bimport\s*\(\s*$/.test(prefix)
      || /\bimport\s*$/.test(prefix)
      || /\b(?:import|export)\s+[^;]*\bfrom\s*$/.test(prefix);
  }).map(literal => ({ url: literal.value, index: literal.start }));
}

function attributeUrls(markup) {
  const urls = [];
  for (const tag of markup.matchAll(/<(?:script|link)\b[^>]*>/gi)) {
    const attributes = /\b(?:src|href)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
    for (const attribute of tag[0].matchAll(attributes)) {
      const url = attribute[1] ?? attribute[2] ?? attribute[3];
      if (/^https?:\/\//i.test(url)) {
        urls.push({ url, index: tag.index + attribute.index });
      }
    }
  }
  return urls;
}

function stripHtmlComments(source) {
  const characters = source.split('');
  const tokens = /<!--|<(script|style)\b[^>]*>/gi;
  let match;
  while ((match = tokens.exec(source))) {
    if (match[0] === '<!--') {
      const close = source.indexOf('-->', tokens.lastIndex);
      const end = close < 0 ? source.length : close + 3;
      blankRange(characters, match.index, end);
      tokens.lastIndex = end;
    } else {
      // HTML-looking text inside JS templates belongs to the JavaScript lexer.
      const closingTag = new RegExp('</' + match[1] + '\\s*>', 'gi');
      closingTag.lastIndex = tokens.lastIndex;
      const close = closingTag.exec(source);
      tokens.lastIndex = close ? closingTag.lastIndex : source.length;
    }
  }
  return characters.join('');
}

/** Prepare code and import URLs without losing original offsets or line numbers. */
export function prepareSource(source) {
  const isHtml = /^\s*<(?:!doctype|!--|[a-z])/i.test(source);
  const html = isHtml ? stripHtmlComments(source) : source;
  if (!isHtml) {
    const scanned = scanCode(html);
    return {
      ...scanned,
      guardCode: restoreGuardLiterals(scanned.code, scanned.literals),
      urls: moduleUrls(scanned.code, scanned.literals),
    };
  }

  const characters = blankText(html).split('');
  const markup = html.split('');
  const literals = [];
  const urls = [];
  const blocks = /<(script|style)\b([^>]*)>([\s\S]*?)<\/\1\s*>/gi;
  for (const match of html.matchAll(blocks)) {
    const start = match.index + match[0].indexOf('>') + 1;
    const content = match[3];
    const scanned = scanCode(content, start, match[1].toLowerCase() === 'style');
    const importMap = /\btype\s*=\s*(?:["']importmap["']|importmap\b)/i.test(match[2]);
    blankRange(markup, start, start + content.length);
    for (let index = 0; index < scanned.code.length; index++) {
      characters[start + index] = scanned.code[index];
    }
    literals.push(...scanned.literals);
    if (importMap) {
      for (const literal of scanned.literals) {
        const prefix = scanned.code.slice(0, literal.start - start);
        if (/:\s*$/.test(prefix) && /^https?:\/\//i.test(literal.value)) {
          urls.push({ url: literal.value, index: literal.start });
        }
      }
    }
  }

  const code = characters.join('');
  urls.push(...attributeUrls(markup.join('')), ...moduleUrls(code, literals));
  return { code, literals, urls, guardCode: restoreGuardLiterals(code, literals) };
}

/** Recognize query-time guards, without treating renderAt itself as a guard. */
export function hasTimeGuard(code) {
  const searchParams = new RegExp(
    '\\b(?:new\\s+)?URLSearchParams\\s*\\(\\s*'
      + '(?:window\\s*\\.\\s*)?location\\s*\\.\\s*search\\s*\\)', 'g',
  );
  const timeLookup = /^\s*\.\s*(?:has|get)\s*\(\s*(['"\x60])t\1\s*\)/;
  for (const match of code.matchAll(searchParams)) {
    if (timeLookup.test(code.slice(match.index + match[0].length))) return true;
    const prefix = code.slice(0, match.index);
    const assignment = /([A-Za-z_$][\w$]*)\s*=\s*$/.exec(prefix);
    if (assignment) {
      const variable = assignment[1].replace(/[$]/g, '\\$&');
      const lookup = new RegExp(
        '(?:^|[^\\w$])' + variable
          + '\\s*\\.\\s*(?:has|get)\\s*\\(\\s*([\\\'"\\x60])t\\1\\s*\\)',
      );
      if (lookup.test(code)) return true;
    }
  }
  const directLookup = new RegExp(
    '\\blocation\\s*\\.\\s*search\\s*\\.\\s*(?:includes|indexOf)'
      + '\\s*\\(\\s*([\\\'"\\x60])[?&]?t=?\\1',
  );
  const regexLookup = /\/[^/\n]*t=[^/\n]*\/[gimyus]*\s*\.\s*test\s*\(\s*location\s*\.\s*search/;
  return directLookup.test(code) || regexLookup.test(code);
}

/** Accept an exact semantic version in a URL path; query versions do not count. */
export function hasPinnedPathVersion(value) {
  try {
    const url = new URL(value);
    const pathname = decodeURIComponent(url.pathname);
    const floatingTag = /@(?:latest\b|[~^]|\d+(?:\.\d+)?(?:\/|$))/i;
    return !floatingTag.test(pathname)
      && /(?:@|\/)v?\d+\.\d+\.\d+(?!\.\d)(?=[/._-]|$)/.test(pathname);
  } catch {
    return false;
  }
}
