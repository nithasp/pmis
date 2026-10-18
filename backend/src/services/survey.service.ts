import pool, { withTransaction } from '../database';
import { Queryable, Row } from '../types/database.types';
import { ListQuery, PagedResult } from '../types/pagination.types';
import { toDate } from '../utils/dates';
import { AppError, notFound } from '../utils/errors';
import { pagedResult } from '../utils/paging';
import { idOrNull, iso, num, str } from '../utils/rows';
import { SqlBuilder } from '../utils/sql';
import { mailService } from './mail.service';
import { randomToken } from './password.service';

const SECTION_TYPES: Record<string, string> = { heading: 'หัวข้อ', evaluation: 'แบบประเมินความพึงพอใจ', question: 'คำถาม' };
const QUESTION_TYPES: Record<string, string> = { short_answer: 'คำตอบสั้น', paragraph: 'ย่อหน้า', multiple_choice: 'หลายตัวเลือก', evaluation: 'ระดับความพึงพอใจ' };

export function createSurveyService() {
  const toListRow = (r: Row): Row => ({
    id: r.id,
    name: str(r.name),
    description: str(r.description),
    publishSchedule: r.publish_schedule === true,
    publishDate: iso(r.publish_date),
    endDate: iso(r.end_date),
    createdAt: iso(r.created_at),
    sentCount: num(r.sent_count),
    answeredCount: num(r.answered_count),
  });

  async function sections(surveyId: number, db: Queryable = pool): Promise<Row[]> {
    const { rows: secs } = await pool.query('SELECT * FROM survey_sections WHERE survey_id = $1 AND deleted_at IS NULL ORDER BY no, id', [surveyId]);
    const { rows: questions } = await db.query(
      'SELECT q.* FROM survey_questions q JOIN survey_sections s ON s.id = q.section_id WHERE s.survey_id = $1 AND q.deleted_at IS NULL ORDER BY q.no, q.id',
      [surveyId],
    );
    const { rows: options } = await db.query(
      'SELECT o.* FROM survey_options o JOIN survey_questions q ON q.id = o.question_id JOIN survey_sections s ON s.id = q.section_id WHERE s.survey_id = $1 AND o.deleted_at IS NULL ORDER BY o.no, o.id',
      [surveyId],
    );
    return secs.map((s) => ({
      id: s.id,
      typeSection: str(s.type_section),
      typeSectionDes: SECTION_TYPES[str(s.type_section)] ?? str(s.type_section),
      title: str(s.title),
      description: str(s.description),
      isRequired: s.is_required === true,
      no: num(s.no, 1),
      satisfactionMin: s.satisfaction_min ?? 1,
      satisfactionDesMin: str(s.satisfaction_des_min),
      satisfactionMax: s.satisfaction_max ?? 5,
      satisfactionDesMax: str(s.satisfaction_des_max),
      questions: questions
        .filter((q) => q.section_id === s.id)
        .map((q) => ({
          id: q.id,
          question: str(q.question),
          typeQuestion: str(q.type_question),
          typeQuestionDes: QUESTION_TYPES[str(q.type_question)] ?? str(q.type_question),
          no: num(q.no, 1),
          options: options.filter((o) => o.question_id === q.id).map((o) => ({ id: o.id, no: num(o.no, 1), optionName: str(o.option_name) })),
        })),
    }));
  }

  async function detailOf(id: number): Promise<Row> {
    const { rows } = await pool.query('SELECT * FROM surveys WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (!rows[0]) throw notFound('แบบสอบถาม', 'survey not found');
    return { ...toListRow(rows[0]), sections: await sections(id) };
  }

  async function saveSections(surveyId: number, items: Row[], tx: Queryable): Promise<void> {
    let sectionNo = 1;
    for (const s of items) {
      const sectionId = idOrNull(s.id);
      if (s.isDelete || s.is_delete) {
        if (sectionId) await tx.query('UPDATE survey_sections SET deleted_at = NOW() WHERE id = $1', [sectionId]);
        continue;
      }
      const typeSection = str(s.typeSection, 'question');
      const values = [surveyId, typeSection, str(s.title), str(s.description), s.isRequired === true, sectionNo++, idOrNull(s.satisfactionMin) ?? (typeSection === 'evaluation' ? 1 : null), str(s.satisfactionDesMin) || null, idOrNull(s.satisfactionMax) ?? (typeSection === 'evaluation' ? 5 : null), str(s.satisfactionDesMax) || null];
      let savedSectionId = sectionId;
      if (sectionId) {
        const { rowCount } = await tx.query(
          `UPDATE survey_sections SET survey_id = $1, type_section = $2, title = $3, description = $4, is_required = $5, no = $6, satisfaction_min = $7, satisfaction_des_min = $8,
             satisfaction_max = $9, satisfaction_des_max = $10 WHERE id = $11 AND survey_id = $1`,
          [...values, sectionId],
        );
        if (!rowCount) savedSectionId = null;
      }
      if (!savedSectionId) {
        const { rows } = await tx.query(
          `INSERT INTO survey_sections (survey_id, type_section, title, description, is_required, no, satisfaction_min, satisfaction_des_min, satisfaction_max, satisfaction_des_max)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
          values,
        );
        savedSectionId = rows[0].id as number;
      }
      let questionNo = 1;
      for (const q of Array.isArray(s.questions) ? s.questions : []) {
        const questionId = idOrNull(q.id);
        if (q.isDelete || q.is_delete) {
          if (questionId) await tx.query('UPDATE survey_questions SET deleted_at = NOW() WHERE id = $1', [questionId]);
          continue;
        }
        const typeQuestion = typeSection === 'evaluation' ? 'evaluation' : str(q.typeQuestion, 'short_answer');
        let savedQuestionId = questionId;
        if (questionId) {
          const { rowCount } = await tx.query('UPDATE survey_questions SET section_id = $1, question = $2, type_question = $3, no = $4 WHERE id = $5', [savedSectionId, str(q.question), typeQuestion, questionNo, questionId]);
          if (!rowCount) savedQuestionId = null;
        }
        if (!savedQuestionId) {
          const { rows } = await tx.query('INSERT INTO survey_questions (section_id, question, type_question, no) VALUES ($1, $2, $3, $4) RETURNING id', [savedSectionId, str(q.question), typeQuestion, questionNo]);
          savedQuestionId = rows[0].id as number;
        }
        questionNo++;
        let optionNo = 1;
        for (const o of Array.isArray(q.options) ? q.options : []) {
          const optionId = idOrNull(o.id);
          if (o.isDelete || o.is_delete) {
            if (optionId) await tx.query('UPDATE survey_options SET deleted_at = NOW() WHERE id = $1', [optionId]);
            continue;
          }
          if (optionId && (await tx.query('UPDATE survey_options SET question_id = $1, option_name = $2, no = $3 WHERE id = $4', [savedQuestionId, str(o.optionName), optionNo, optionId])).rowCount) {
            optionNo++;
            continue;
          }
          await tx.query('INSERT INTO survey_options (question_id, option_name, no) VALUES ($1, $2, $3)', [savedQuestionId, str(o.optionName), optionNo++]);
        }
      }
    }
  }

  return {
    async list(filter: Row, query: ListQuery): Promise<PagedResult<Row>> {
      const b = new SqlBuilder();
      b.where('s.deleted_at IS NULL');
      b.between('s.publish_date', filter.beginDate, filter.endDate);
      b.like(['s.name', 's.description'], query.search);
      const where = b.whereClause();
      const { rows: countRows } = await pool.query(`SELECT COUNT(*) FROM surveys s${where}`, b.params);
      const sort: Record<string, string> = { id: 's.id', name: 's.name', publishDate: 's.publish_date', endDate: 's.end_date' };
      const { rows } = await pool.query(
        `SELECT s.*, (SELECT COUNT(*) FROM survey_tokens t WHERE t.survey_id = s.id) AS sent_count,
                (SELECT COUNT(*) FROM survey_tokens t WHERE t.survey_id = s.id AND t.answered_at IS NOT NULL) AS answered_count
         FROM surveys s${where}${b.orderBy(query.order, sort, 's.created_at DESC')}${b.limit(query)}`,
        b.params,
      );
      return pagedResult(rows.map(toListRow), Number(countRows[0]?.count ?? 0), query);
    },

    detail: detailOf,

    async save(id: number | null, input: Row, by: string): Promise<Row> {
      const name = str(input.name).trim();
      if (!name) throw new AppError('กรุณาระบุชื่อแบบสอบถาม', 400, 'invalid_request', 'name is required');
      const values = [name, str(input.description), input.publishSchedule === true, toDate(input.publishDate), toDate(input.endDate)];
      const savedId = await withTransaction(async (tx) => {
        let targetId = id;
        if (targetId === null) {
          const { rows } = await tx.query('INSERT INTO surveys (name, description, publish_schedule, publish_date, end_date, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id', [...values, by]);
          targetId = rows[0].id as number;
        } else {
          const { rowCount } = await tx.query('UPDATE surveys SET name = $2, description = $3, publish_schedule = $4, publish_date = $5, end_date = $6, updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL', [targetId, ...values]);
          if (!rowCount) throw notFound('แบบสอบถาม', 'survey not found');
        }
        await saveSections(targetId, Array.isArray(input.sections) ? input.sections : [], tx);
        return targetId;
      });
      return detailOf(savedId);
    },

    async remove(id: number): Promise<void> {
      const { rowCount } = await pool.query('UPDATE surveys SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL', [id]);
      if (!rowCount) throw notFound('แบบสอบถาม', 'survey not found');
    },

    async send(id: number, emails: string[]): Promise<Row> {
      const survey = await detailOf(id);
      const clean = [...new Set(emails.map((e) => str(e).trim().toLowerCase()).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)))];
      if (!clean.length) throw new AppError('กรุณาระบุอีเมลอย่างน้อย 1 รายการ', 400, 'invalid_request', 'At least one e-mail is required');
      const links: Row[] = [];
      for (const email of clean) {
        const token = randomToken(24);
        await pool.query('INSERT INTO survey_tokens (survey_id, email, token) VALUES ($1, $2, $3)', [id, email, token]);
        const link = mailService.surveyLink(token);
        await mailService.send({ to: email, subject: `PMIS: แบบสอบถาม ${survey.name}`, text: `กรุณาตอบแบบสอบถามได้ที่ ${link}`, link });
        links.push({ email, link });
      }
      return { sent: links.length, links };
    },

    async byToken(token: string): Promise<Row> {
      const { rows } = await pool.query('SELECT t.*, s.end_date, s.publish_date, s.deleted_at AS survey_deleted FROM survey_tokens t JOIN surveys s ON s.id = t.survey_id WHERE t.token = $1', [token]);
      const t = rows[0];
      if (!t || t.survey_deleted) throw new AppError('ไม่พบแบบสอบถามหรือลิงก์หมดอายุ', 404, 'not_found', 'survey_token_invalid');
      if (t.end_date && new Date(t.end_date as string) < new Date()) throw new AppError('แบบสอบถามนี้ปิดรับคำตอบแล้ว', 410, 'bad_request', 'survey_expired');
      if (t.answered_at) return { code: 'success_survey', surveyId: t.survey_id };
      return { ...(await detailOf(t.survey_id as number)), token, code: 'open' };
    },

    async submit(input: Row): Promise<Row> {
      const token = str(input.token);
      const { rows } = await pool.query('SELECT * FROM survey_tokens WHERE token = $1', [token]);
      const t = rows[0];
      if (!t) throw new AppError('ไม่พบแบบสอบถามหรือลิงก์หมดอายุ', 404, 'not_found', 'survey_token_invalid');
      if (t.answered_at) throw new AppError('คุณตอบแบบสอบถามนี้แล้ว', 400, 'bad_request', 'survey_already_answered');
      const answers: Row[] = (Array.isArray(input.questions) ? input.questions : []).filter((a: Row) => a && idOrNull(a.questionId));
      await withTransaction(async (tx) => {
        for (const a of answers) {
          await tx.query('INSERT INTO survey_answers (token_id, survey_id, question_id, ans_text, ans_option_id, ans_point) VALUES ($1, $2, $3, $4, $5, $6)', [
            t.id,
            t.survey_id,
            idOrNull(a.questionId),
            a.ansText === undefined || a.ansText === null ? null : str(a.ansText),
            idOrNull(a.ansOptionId),
            a.ansPoint === undefined || a.ansPoint === null || a.ansPoint === '' ? null : Math.round(num(a.ansPoint)),
          ]);
        }
        await tx.query('UPDATE survey_tokens SET answered_at = NOW() WHERE id = $1', [t.id]);
      });
      return { code: 'success_survey', surveyId: t.survey_id };
    },

    async result(id: number): Promise<Row> {
      const survey = await detailOf(id);
      const { rows: answers } = await pool.query('SELECT * FROM survey_answers WHERE survey_id = $1', [id]);
      const points: number[] = [];
      for (const section of survey.sections as Row[]) {
        for (const question of section.questions as Row[]) {
          const mine = answers.filter((a) => a.question_id === question.id);
          if (section.typeSection === 'evaluation') {
            const min = num(section.satisfactionMin, 1);
            const max = num(section.satisfactionMax, 5);
            const values: Row[] = [];
            for (let p = min; p <= max; p++) {
              const count = mine.filter((a) => num(a.ans_point) === p).length;
              values.push({ point: p, count, percentage: mine.length ? Math.round((count / mine.length) * 10000) / 100 : 0 });
            }
            question.values = values;
            question.average = mine.length ? Math.round((mine.reduce((s, a) => s + num(a.ans_point), 0) / mine.length) * 100) / 100 : 0;
            for (const a of mine) points.push(num(a.ans_point) / max);
          } else if (question.typeQuestion === 'multiple_choice') {
            question.options = (question.options as Row[]).map((o) => {
              const count = mine.filter((a) => a.ans_option_id === o.id).length;
              return { ...o, count, percentage: mine.length ? Math.round((count / mine.length) * 10000) / 100 : 0 };
            });
            question.values = question.options.map((o: Row) => ({ point: o.optionName, count: o.count, percentage: o.percentage }));
          } else {
            question.answers = mine.map((a) => str(a.ans_text)).filter(Boolean);
          }
          question.answerCount = mine.length;
        }
      }
      const sum = points.length ? Math.round((points.reduce((s, p) => s + p, 0) / points.length) * 10000) / 100 : 0;
      return {
        ...survey,
        totalAnswers: new Set(answers.map((a) => a.token_id)).size,
        satisfaction: {
          sum,
          values: [
            { point: 'พึงพอใจ', count: Math.round(sum), percentage: sum },
            { point: 'อื่น ๆ', count: Math.round(100 - sum), percentage: Math.round((100 - sum) * 100) / 100 },
          ],
        },
      };
    },
  };
}

export type SurveyService = ReturnType<typeof createSurveyService>;
