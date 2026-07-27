// 카테고리 정의: 필요에 맞게 라벨/설명/색상을 자유롭게 수정하세요.
// icon 값은 pages/index.js에서 <img>로 그대로 렌더링되는 이미지 URL입니다.
export const CATEGORIES = [
  {
    id: '디자인 시스템',
    label: '디자인 시스템',
    desc: '가이드, 컴포넌트, 토큰 등',
    icon: 'https://img.icons8.com/parakeet/96/design.png',
    color: '#2F6FED',
  },
  {
    id: '광고주 예외 케이스',
    label: '예외 케이스',
    desc: '예외 케이스와 특이사항',
    icon: 'https://img.icons8.com/parakeet/96/pin.png',
    color: '#8B5CF6',
  },
  {
    id: '폰트',
    label: '타이포그래피',
    desc: '타이포그래피와 적용 규칙',
    icon: 'https://img.icons8.com/parakeet/96/auto-rotate-based-on-text.png',
    color: '#16A34A',
  },
  {
    id: '개발',
    label: '개발 이슈',
    desc: '개발 가이드, 이슈, 해결',
    icon: 'https://img.icons8.com/parakeet/96/code.png',
    color: '#F97316',
    // parakeet 스타일의 code.png 아이콘이 연보라색으로 렌더링되어
    // CSS 필터로 색상을 연하늘색 톤으로 보정합니다.
    iconFilter: 'hue-rotate(-70deg) saturate(0.85) brightness(1.08)',
  },
  {
    id: '기타',
    label: '기타',
    desc: '그 외 자주 묻는 정보',
    icon: 'https://img.icons8.com/parakeet/96/more.png',
    color: '#6B7280',
  },
];

export function categoryMeta(id) {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}
