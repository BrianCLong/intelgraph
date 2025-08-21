from .database import Base, engine


def main():
    Base.metadata.create_all(bind=engine)
    print("Database initialized")


if __name__ == "__main__":
    main()
