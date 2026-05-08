import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { CounsellingModule } from './counselling.module';
import { PrismaService } from '../../prisma/prisma.service';

describe('CounsellingController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CounsellingModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /counselling', () => {
    it('should return all counselling options', () => {
      return request(app.getHttpServer())
        .get('/counselling')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0]).toHaveProperty('id');
          expect(res.body[0]).toHaveProperty('value');
          expect(res.body[0]).toHaveProperty('label');
          expect(res.body[0]).toHaveProperty('bodies');
          expect(Array.isArray(res.body[0].bodies)).toBe(true);
        });
    });
  });

  describe('GET /counselling/value/:value', () => {
    it('should return NEET UG counselling option', () => {
      return request(app.getHttpServer())
        .get('/counselling/value/neet-ug')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('value', 'neet-ug');
          expect(res.body).toHaveProperty('label', 'NEET UG');
          expect(res.body.bodies.length).toBe(44); // NEET UG has 44 bodies
        });
    });

    it('should return 404 for non-existent value', () => {
      return request(app.getHttpServer())
        .get('/counselling/value/non-existent')
        .expect(404);
    });
  });

  describe('GET /counselling/:id', () => {
    let counsellingId: string;

    beforeAll(async () => {
      const option = await prismaService.counsellingOption.findFirst();
      counsellingId = option.id;
    });

    it('should return a specific counselling option by id', () => {
      return request(app.getHttpServer())
        .get(`/counselling/${counsellingId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(counsellingId);
          expect(res.body).toHaveProperty('value');
          expect(res.body).toHaveProperty('label');
          expect(Array.isArray(res.body.bodies)).toBe(true);
        });
    });
  });

  describe('POST /counselling (Protected)', () => {
    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .post('/counselling')
        .send({
          value: 'test-exam',
          label: 'Test Exam',
          desc: 'Test Description',
          bodies: [],
        })
        .expect(401);
    });

    // Note: For authenticated tests, you would need to mock or provide a valid auth token
  });

  describe('PATCH /counselling/:id (Protected)', () => {
    let counsellingId: string;

    beforeAll(async () => {
      const option = await prismaService.counsellingOption.findFirst();
      counsellingId = option.id;
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .patch(`/counselling/${counsellingId}`)
        .send({
          label: 'Updated Label',
        })
        .expect(401);
    });
  });

  describe('DELETE /counselling/:id (Protected)', () => {
    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .delete('/counselling/some-id')
        .expect(401);
    });
  });
});
