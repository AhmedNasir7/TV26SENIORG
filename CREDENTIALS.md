# Login credentials

Demo accounts for the **local Docker database**. Sign in at http://localhost:3000/login.
Do not reuse these passwords for a hosted deployment.

## One account per user type

| User type | Email | Password | Lands on |
|---|---|---|---|
| **Administrator** | `admin.demo@secureexam.test` | `Demo-chqRodTGUQGO` | `/admin` |
| **Examiner** | `examiner.demo@secureexam.test` | `Demo-4JHnGboxMAq-` | `/examiner` |
| **Candidate** | `candidate.demo@secureexam.test` | `Demo-mrEY8GNJI506` | `/candidate` |

- **Administrator:** manages users and roles, sees the platform overview and audit log.
- **Examiner:** owns the demo examinations and question bank.
- **Candidate:** enrolled in all published examinations, with a finished midterm result.

## More examiner accounts

| Email | Name | Password |
|---|---|---|
| `examiner2.demo@secureexam.test` | Second Examiner | `Seed-Mk0LR5T2Titb` |

## More candidate accounts

| Email | Name | Password |
|---|---|---|
| `candidate01@secureexam.test` | Ayesha Khan | `Seed-Mk0LR5T2Titb` |
| `candidate02@secureexam.test` | Bilal Ahmed | `Seed-Mk0LR5T2Titb` |
| `candidate03@secureexam.test` | Hira Malik | `Seed-Mk0LR5T2Titb` |
| `candidate04@secureexam.test` | Usman Tariq | `Seed-Mk0LR5T2Titb` |
| `candidate05@secureexam.test` | Fatima Noor | `Seed-Mk0LR5T2Titb` |
| `candidate06@secureexam.test` | Hamza Sheikh | `Seed-Mk0LR5T2Titb` |
| `candidate07@secureexam.test` | Zainab Ali | `Seed-Mk0LR5T2Titb` |
| `candidate08@secureexam.test` | Saad Qureshi | `Seed-Mk0LR5T2Titb` |
| `candidate09@secureexam.test` | Maryam Iqbal | `Seed-Mk0LR5T2Titb` |
| `candidate10@secureexam.test` | Ali Raza | `Seed-Mk0LR5T2Titb` |
| `candidate11@secureexam.test` | Noor Fatima | `Seed-Mk0LR5T2Titb` |
| `candidate12@secureexam.test` | Danish Mehmood | `Seed-Mk0LR5T2Titb` |
| `candidate13@secureexam.test` | Sana Javed | `Seed-Mk0LR5T2Titb` |
| `candidate14@secureexam.test` | Omar Farooq | `Seed-Mk0LR5T2Titb` |
| `candidate15@secureexam.test` | Iqra Aslam | `Seed-Mk0LR5T2Titb` |
| `candidate16@secureexam.test` | Talha Nadeem | `Seed-Mk0LR5T2Titb` |
| `candidate17@secureexam.test` | Mahnoor Butt | `Seed-Mk0LR5T2Titb` |
| `candidate18@secureexam.test` | Ahsan Siddiqui | `Seed-Mk0LR5T2Titb` |
| `candidate19@secureexam.test` | Rabia Anwar | `Seed-Mk0LR5T2Titb` |
| `candidate20@secureexam.test` | Faizan Akhtar | `Seed-Mk0LR5T2Titb` |
| `candidate21@secureexam.test` | Amna Rashid | `Seed-Mk0LR5T2Titb` |
| `candidate22@secureexam.test` | Shahzaib Hassan | `Seed-Mk0LR5T2Titb` |
| `candidate23@secureexam.test` | Kiran Shafiq | `Seed-Mk0LR5T2Titb` |
| `candidate24@secureexam.test` | Waleed Zafar | `Seed-Mk0LR5T2Titb` |
| `candidate25@secureexam.test` | Laiba Imran | `Seed-Mk0LR5T2Titb` |
| `candidate26@secureexam.test` | Arslan Yousaf | `Seed-Mk0LR5T2Titb` |
| `candidate27@secureexam.test` | Nimra Sohail | `Seed-Mk0LR5T2Titb` |
| `candidate28@secureexam.test` | Huzaifa Khalid | `Seed-Mk0LR5T2Titb` |
| `candidate29@secureexam.test` | Eman Waseem | `Seed-Mk0LR5T2Titb` |
| `candidate30@secureexam.test` | Moiz Abbasi | `Seed-Mk0LR5T2Titb` |

## Accounts created from your `.env`

Their passwords are the matching `*_PASSWORD` values in your `.env`; they are not copied here.

| User type | Email | Name |
|---|---|---|
| Administrator | `admin@estatepro.com` | Admin |
| Examiner | `teacher2@estatepro.com` | Teacher Two |
| Candidate | `student2@estatepro.com` | Student Two |

## If a login stops working

- Five wrong passwords lock an account for 15 minutes; an administrator can unlock it under Users.
- A password reset or change replaces the password shown here.
- A wiped database (`docker compose ... down -v`) needs the migration and seeds again.
