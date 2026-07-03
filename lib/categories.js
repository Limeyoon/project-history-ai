// 카테고리 정의: 필요에 맞게 라벨/설명/색상을 자유롭게 수정하세요.
export const CATEGORIES = [
  {
    id: '디자인 시스템',
    label: '자주 질문하는 디자인 시스템',
    desc: '가이드, 컴포넌트, 토큰 등',
    icon: '◆',
    color: '#2F6FED',
  },
  {
    id: '광고주 예외 케이스',
    label: '광고주 예외 케이스',
    desc: '예외 케이스와 특이사항',
    icon: '▪',
    color: '#8B5CF6',
  },
  {
    id: '폰트',
    label: '폰트',
    desc: '타이포그래피와 적용 규칙',
    icon: 'Aa',
    color: '#16A34A',
  },
  {
    id: '개발',
    label: '개발',
    desc: '개발 가이드, 이슈, 해결',
    icon: '</>',
    color: '#F97316',
  },
  {
    id: '기타',
    label: '기타',
    desc: '그 외 자주 묻는 정보',
    icon: '⋯',
    color: '#6B7280',
  },
];

export function categoryMeta(id) {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}
