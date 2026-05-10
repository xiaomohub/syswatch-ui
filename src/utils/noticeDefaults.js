/** @returns {Record<string, unknown>} */
export function createEmptyRoute() {
  return {
    noticeType: 'Email',
    noticeTmplId: '',
    severitys: ['P1'],
    hook: '',
    sign: '',
    subject: '',
    to: [],
    cc: [],
    effectiveTime: {
      week: [],
      startTime: 0,
      endTime: 0
    }
  }
}

export const NOTICE_TYPES = ['Email', 'FeiShu', 'DingDing', 'WeChat', 'WebHook', 'Slack']

export const SEVERITY_OPTIONS = ['P0', 'P1', 'P2']
