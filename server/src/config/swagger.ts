import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SMS - Security Management System API',
      version: '1.0.0',
      description: 'API-Dokumentation für das SMS SaaS-Plattform',
      contact: {
        name: 'SMS Support',
        email: 'support@sms-platform.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Development Server',
      },
      {
        url: 'https://api.sms-platform.com/api',
        description: 'Production Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Token für Plattform-Admin Authentifizierung',
        },
        licenseKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-License-Key',
          description: 'License Key für Tenant-Authentifizierung',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Fehlermeldung',
            },
            message: {
              type: 'string',
              description: 'Detaillierte Fehlerbeschreibung',
            },
          },
        },
        Tenant: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            tenantId: {
              type: 'string',
              description: 'Eindeutige Tenant-ID',
            },
            companyName: {
              type: 'string',
            },
            contactEmail: {
              type: 'string',
              format: 'email',
            },
            licenseStatus: {
              type: 'string',
              enum: ['TEST', 'ACTIVE', 'PAYMENT_PENDING', 'GRACE_PERIOD', 'RESTRICTED', 'SUSPENDED', 'CANCELLED'],
            },
            employeeLimit: {
              type: 'integer',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Plan: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
            },
            slug: {
              type: 'string',
            },
            monthlyPrice: {
              type: 'number',
              format: 'float',
            },
            yearlyPrice: {
              type: 'number',
              format: 'float',
            },
            employeeLimit: {
              type: 'integer',
            },
            features: {
              type: 'object',
              additionalProperties: {
                type: 'boolean',
              },
            },
          },
        },
        Subscription: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            tenantId: {
              type: 'string',
              format: 'uuid',
            },
            planId: {
              type: 'string',
              format: 'uuid',
            },
            status: {
              type: 'string',
              enum: ['TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID', 'INCOMPLETE', 'PAUSED'],
            },
            billingInterval: {
              type: 'string',
              enum: ['MONTHLY', 'YEARLY'],
            },
            currentPeriodStart: {
              type: 'string',
              format: 'date-time',
            },
            currentPeriodEnd: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Employee: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            tenantId: {
              type: 'string',
              format: 'uuid',
            },
            firstName: {
              type: 'string',
            },
            lastName: {
              type: 'string',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            personnelNumber: {
              type: 'string',
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'on_leave', 'terminated'],
            },
          },
        },
        Customer: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            tenantId: {
              type: 'string',
              format: 'uuid',
            },
            companyName: {
              type: 'string',
            },
            customerNumber: {
              type: 'string',
            },
            contactEmail: {
              type: 'string',
              format: 'email',
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'prospect'],
            },
          },
        },
        Deployment: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            tenantId: {
              type: 'string',
              format: 'uuid',
            },
            objectId: {
              type: 'string',
              format: 'uuid',
            },
            employeeId: {
              type: 'string',
              format: 'uuid',
            },
            date: {
              type: 'string',
              format: 'date',
            },
            startTime: {
              type: 'string',
            },
            endTime: {
              type: 'string',
            },
            status: {
              type: 'string',
              enum: ['planned', 'confirmed', 'cancelled', 'completed'],
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Platform',
        description: 'Plattform-Administration (nur für Software-Anbieter)',
      },
      {
        name: 'Tenants',
        description: 'Mandanten-Verwaltung',
      },
      {
        name: 'Subscriptions',
        description: 'Abonnement-Verwaltung',
      },
      {
        name: 'Plans',
        description: 'Tarif-Verwaltung',
      },
      {
        name: 'Stripe',
        description: 'Stripe Payment Integration',
      },
      {
        name: 'Employees',
        description: 'Mitarbeiter-Verwaltung (Tenant)',
      },
      {
        name: 'Customers',
        description: 'Kunden-Verwaltung (Tenant)',
      },
      {
        name: 'Objects',
        description: 'Objekt-Verwaltung (Tenant)',
      },
      {
        name: 'Deployments',
        description: 'Einsatz-Planung (Tenant)',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
