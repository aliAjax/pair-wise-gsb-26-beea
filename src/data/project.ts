// 资料层：页面展示用的静态项目元信息

export const project = {
  id: "hxwl-12",
  port: 5112,
  title: "心理咨询个案台账",
  subtitle: "个案 · 风险会谈 · 联系尝试 · 安全计划 —— 会谈间隙的危机跟进接续",
  stack: "React + Vite + TypeScript + CSS",
  domain: "心理咨询",
  users: ["咨询师", "督导", "机构管理员"],
  storageNote: "数据仅保存在本机浏览器（localStorage），不上传服务器",
} as const;
