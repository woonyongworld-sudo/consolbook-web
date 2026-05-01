import type { StandardDictionary } from "../domain/types";

// 디폴트 표준 사전 — 사용자가 편집 페이지에서 수정·추가·제거할 수 있음.
// 첫 로드 시 또는 "디폴트로 리셋" 시 이 값이 사용됨.
export const DEFAULT_DICTIONARY: StandardDictionary = {
  version: "1.0.0",
  updated_at: "2026-05-01T00:00:00Z",
  sheets: [
    {
      type: "BS",
      label: "재무상태표",
      description:
        "기업의 일정 시점 자산·부채·자본을 나타내는 표. 자산총계 = 부채총계 + 자본총계 등식이 성립.",
      headers: [
        {
          key: "account_id",
          label: "표준계정과목코드",
          description: "표준계정과목 마스터의 코드 (예: 1000001)",
          dataType: "code",
          required: true,
        },
        {
          key: "account_nm",
          label: "계정과목명",
          description: "외부 양식의 계정 이름. 표준 코드와 함께 식별 보조용.",
          dataType: "text",
          required: true,
        },
        {
          key: "amount",
          label: "금액",
          description: "당기 금액 (원 단위, 음수도 가능)",
          dataType: "number",
          required: true,
        },
        {
          key: "dr_cr",
          label: "차/대구분",
          description: "차변(자산·비용) / 대변(부채·자본·수익) 구분",
          dataType: "enum",
          required: true,
          enumValues: ["차변", "대변"],
        },
        {
          key: "frmtrm_amount",
          label: "전기금액",
          description: "전기 결산 금액 (있으면 비교 검증에 사용)",
          dataType: "number",
          required: false,
        },
        {
          key: "memo",
          label: "메모",
          description: "임의 비고",
          dataType: "text",
          required: false,
        },
      ],
    },
    {
      type: "IS",
      label: "손익계산서",
      description:
        "기업의 일정 기간 수익·비용·손익을 나타내는 표. 차변(비용·손실) 합 = 대변(수익·이익) 합.",
      headers: [
        {
          key: "account_id",
          label: "표준계정과목코드",
          description: "표준계정과목 마스터의 코드",
          dataType: "code",
          required: true,
        },
        {
          key: "account_nm",
          label: "계정과목명",
          description: "외부 양식의 계정 이름",
          dataType: "text",
          required: true,
        },
        {
          key: "amount",
          label: "금액",
          description: "당기 금액",
          dataType: "number",
          required: true,
        },
        {
          key: "dr_cr",
          label: "차/대구분",
          description: "차변(비용) / 대변(수익) 구분",
          dataType: "enum",
          required: true,
          enumValues: ["차변", "대변"],
        },
        {
          key: "frmtrm_amount",
          label: "전기금액",
          description: "전기 결산 금액",
          dataType: "number",
          required: false,
        },
        {
          key: "memo",
          label: "메모",
          description: "임의 비고",
          dataType: "text",
          required: false,
        },
      ],
    },
    {
      type: "CIS",
      label: "포괄손익계산서",
      description:
        "당기순이익에 기타포괄손익을 가감해 총포괄손익을 표시. 손익계산서를 보완.",
      headers: [
        {
          key: "account_id",
          label: "표준계정과목코드",
          description: "표준계정과목 마스터의 코드",
          dataType: "code",
          required: true,
        },
        {
          key: "account_nm",
          label: "계정과목명",
          description: "외부 양식의 계정 이름",
          dataType: "text",
          required: true,
        },
        {
          key: "amount",
          label: "금액",
          description: "당기 금액 (음수 가능)",
          dataType: "number",
          required: true,
        },
        {
          key: "frmtrm_amount",
          label: "전기금액",
          description: "전기 금액",
          dataType: "number",
          required: false,
        },
      ],
    },
    {
      type: "SCE",
      label: "자본변동표",
      description:
        "기간 동안 자본의 구성 항목(자본금, 이익잉여금 등)이 어떻게 변동했는지 표시.",
      headers: [
        {
          key: "account_id",
          label: "표준계정과목코드",
          description: "자본 항목의 표준 코드",
          dataType: "code",
          required: true,
        },
        {
          key: "account_nm",
          label: "계정과목명",
          description: "자본 항목 이름 (자본금, 이익잉여금 등)",
          dataType: "text",
          required: true,
        },
        {
          key: "equity_component",
          label: "자본 구성요소",
          description:
            "자본금 / 자본잉여금 / 자본조정 / 기타포괄손익누계액 / 이익잉여금 / 비지배지분 등",
          dataType: "text",
          required: true,
        },
        {
          key: "amount",
          label: "변동금액",
          description: "기간 중 변동 금액 (증감)",
          dataType: "number",
          required: true,
        },
        {
          key: "period",
          label: "기간",
          description: "기초 / 변동 / 기말 등 시점 표시",
          dataType: "text",
          required: false,
        },
      ],
    },
    {
      type: "CF",
      label: "현금흐름표",
      description:
        "기간 동안 현금의 유입·유출을 영업/투자/재무 활동별로 표시.",
      headers: [
        {
          key: "account_id",
          label: "표준계정과목코드",
          description: "현금흐름 항목의 표준 코드",
          dataType: "code",
          required: true,
        },
        {
          key: "account_nm",
          label: "계정과목명",
          description: "현금흐름 항목 이름",
          dataType: "text",
          required: true,
        },
        {
          key: "activity",
          label: "활동구분",
          description: "영업활동 / 투자활동 / 재무활동 구분",
          dataType: "enum",
          required: true,
          enumValues: ["영업활동", "투자활동", "재무활동"],
        },
        {
          key: "amount",
          label: "금액",
          description: "현금 유입(+) 또는 유출(-) 금액",
          dataType: "number",
          required: true,
        },
        {
          key: "frmtrm_amount",
          label: "전기금액",
          description: "전기 금액",
          dataType: "number",
          required: false,
        },
      ],
    },
    {
      type: "NOTE",
      label: "주석",
      description:
        "재무제표를 보충하는 정성·정량 정보. 회계정책, 우발사항, 특수관계자거래 등.",
      headers: [
        {
          key: "note_no",
          label: "주석번호",
          description: "주석 식별 번호 (예: 1, 2-1, 37-7)",
          dataType: "code",
          required: true,
        },
        {
          key: "note_title",
          label: "주석제목",
          description: "주석의 제목 (예: 일반사항, 재무제표 작성기준)",
          dataType: "text",
          required: true,
        },
        {
          key: "note_body",
          label: "본문",
          description: "주석의 텍스트 내용 (HTML 또는 plain text)",
          dataType: "text",
          required: true,
        },
        {
          key: "note_table",
          label: "표 데이터",
          description: "주석 안에 포함된 표 데이터 (JSON)",
          dataType: "text",
          required: false,
        },
      ],
    },
  ],
};
