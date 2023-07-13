import express, { Request, Response } from 'express';
import { Sequelize, Model, DataTypes } from 'sequelize';

// Database configuration
const sequelize = new Sequelize('your_database', 'your_username', 'your_password', {
  host: 'localhost',
  dialect: 'mysql',
});

// Define Contact model
interface ContactAttributes {
  id: number;
  phoneNumber: string | null;
  email: string | null;
  linkedId: number | null;
  linkPrecedence: 'primary' | 'secondary';
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

class Contact extends Model<ContactAttributes> {}
Contact.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    linkedId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    linkPrecedence: {
      type: DataTypes.ENUM('primary', 'secondary'),
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Contact',
    paranoid: true,
  }
);

// Create Express app
const app = express();
app.use(express.json());

// Identify endpoint
app.post('/identify', async (req: Request, res: Response) => {
  try {
    const { email, phoneNumber } = req.body;

    let primaryContact: Contact | null = null;
    let secondaryContacts: Contact[] = [];

    if (email || phoneNumber) {
      // Find primary contact
      primaryContact = await Contact.findOne({
        where: {
          [sequelize.Op.or]: [
            { email },
            { phoneNumber },
          ],
          linkPrecedence: 'primary',
        },
      });

      // Create new primary contact if not found
      if (!primaryContact) {
        primaryContact = await Contact.create({
          email,
          phoneNumber,
          linkPrecedence: 'primary',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Find secondary contacts
      secondaryContacts = await Contact.findAll({
        where: {
          linkedId: primaryContact.id,
          linkPrecedence: 'secondary',
        },
      });
    }

    const contactData = {
      primaryContactId: primaryContact?.id,
      emails: [primaryContact?.email, ...secondaryContacts.map(c => c.email)].filter(Boolean),
      phoneNumbers: [primaryContact?.phoneNumber, ...secondaryContacts.map(c => c.phoneNumber)].filter(Boolean),
      secondaryContactIds: secondaryContacts.map(c => c.id),
    };

    res.json({ contact: contactData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
