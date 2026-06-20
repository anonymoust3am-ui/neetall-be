import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { InstituteModule } from './institutes.module';

describe('InstituteController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [InstituteModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /institutes/filter-data', () => {
    it('should return filter data', () => {
      return request(app.getHttpServer())
        .get('/institutes/filter-data')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
        });
    });
  });

  describe('GET /institutes', () => {
    it('should return list of institutes', () => {
      return request(app.getHttpServer())
        .get('/institutes')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.data) || res.body.data).toBeDefined();
        });
    });

    it('should accept query parameters', () => {
      return request(app.getHttpServer()).get('/institutes?page=1').expect(200);
    });

    it('should handle pagination', () => {
      return request(app.getHttpServer()).get('/institutes?page=2').expect(200);
    });

    it('should handle filters', () => {
      return request(app.getHttpServer())
        .get('/institutes?states=maharashtra&page=1')
        .expect(200);
    });
  });

  describe('GET /institutes/:id', () => {
    it('should return institute details for valid ID', () => {
      return request(app.getHttpServer())
        .get('/institutes/1')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
        });
    });

    it('should handle invalid ID', () => {
      return request(app.getHttpServer())
        .get('/institutes/invalid')
        .expect(400);
    });
  });
});
