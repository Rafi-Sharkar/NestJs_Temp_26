// import { Test, TestingModule } from '@nestjs/testing';
// import { INestApplication } from '@nestjs/common';
// import request from 'supertest';
// import { describe, beforeEach, it } from '@jest/globals';
// import { App } from 'supertest/types';
// import { AppModule } from './../src/app.module';

// describe('AppController (e2e)', () => {
//   let app: INestApplication<App>;

//   beforeEach(async () => {
//     const moduleFixture: TestingModule = await Test.createTestingModule({
//       imports: [AppModule],
//     }).compile();

//     app = moduleFixture.createNestApplication();
//     await app.init();
//   });

//   it('/ (GET)', async () => {
//     await request(app.getHttpServer())
//       .get('/dev-tools/users')
//       .expect(200)
//       .expect('Hello World!');
//   });
// });
