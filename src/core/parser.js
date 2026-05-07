/**
 * Skills.md 파서
 * 
 * frontmatter(YAML) + 마크다운 본문을 파싱하여 시스템이 사용할 수 있는
 * 구조화된 규칙 객체로 변환한다.
 * 
 * 의존성: 외부 라이브러리 없이 정규식으로 핵심 패턴만 처리.
 *        실제 운영에서는 gray-matter + react-markdown 사용을 권장하지만,
 *        해커톤 환경에서는 가벼운 자체 구현으로 충분하다.
 * 
 * @param {string} mdText - .md 파일의 raw 텍스트
 * @returns {object} { frontmatter, sections, rawText }
 */
export function parseSkillsMd(mdText) {
  const { frontmatter, body } = extractFrontmatter(mdText);
  const sections = extractSections(body);
  return { frontmatter, sections, rawText: mdText };
}

/**
 * frontmatter 추출 (--- 사이의 YAML)
 */
function extractFrontmatter(mdText) {
  const match = mdText.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: mdText };

  const yamlText = match[1];
  const body = match[2];
  const frontmatter = {};

  // 단순 key: value 라인만 처리 (배열·중첩은 skip)
  yamlText.split('\n').forEach(line => {
    const m = line.match(/^([a-zA-Z_][\w]*)\s*:\s*(.+)$/);
    if (m) {
      frontmatter[m[1]] = m[2].replace(/^['"]|['"]$/g, '').trim();
    }
  });

  return { frontmatter, body };
}

/**
 * 헤딩 기반 섹션 추출
 * # 헤딩 아래 모든 텍스트를 그 섹션의 content로 묶음
 */
function extractSections(body) {
  const sections = [];
  const lines = body.split('\n');
  let currentSection = null;

  lines.forEach(line => {
    const headingMatch = line.match(/^(#+)\s+(.+)$/);
    if (headingMatch) {
      if (currentSection) sections.push(currentSection);
      currentSection = {
        level: headingMatch[1].length,
        title: headingMatch[2].trim(),
        content: [],
        bullets: [],
      };
    } else if (currentSection) {
      currentSection.content.push(line);
      // 불릿 추출
      const bulletMatch = line.match(/^\s*-\s+(.+)$/);
      if (bulletMatch) {
        currentSection.bullets.push(bulletMatch[1]);
      }
    }
  });

  if (currentSection) sections.push(currentSection);

  return sections;
}

/**
 * Skills 번들의 모든 .md 파일을 한 번에 fetch + 파싱
 * @param {string} bundleId - 번들 폴더명 (예: "insight-forge-default")
 * @returns {Promise<object>} { fileName: parsed, ... }
 */
export async function loadBundle(bundleId) {
  const files = ['data-rules', 'metric-rules', 'viz-rules', 'insight-rules', 'report-rules'];
  const bundle = { id: bundleId, files: {} };

  await Promise.all(
    files.map(async (name) => {
      try {
        const res = await fetch(`/skills/${bundleId}/${name}.md`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        bundle.files[name] = parseSkillsMd(text);
      } catch (err) {
        console.warn(`[Skills.md Loader] ${bundleId}/${name}.md 로드 실패:`, err.message);
        bundle.files[name] = { frontmatter: {}, sections: [], rawText: '' };
      }
    })
  );

  return bundle;
}
