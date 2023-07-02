import argparse
import os
from git import Repo
import json

def create_tag(tag_name: str):
    repo = Repo(os.path.dirname(os.path.realpath(__file__)))
    repo.create_tag(tag_name, message=f"chore(bump): v{tag_name}")
    print(f"Tag {tag_name} created")
    # commit changelog
    repo.git.add("CHANGELOG.md")
    repo.git.add("package.json")
    repo.index.commit("chore(VERSION): update VERSION")
    print("Changelog updated | Version file updated")
    # push tag
    try:
        origin = repo.remote(name="origin")
        origin.push(tag_name)
        origin.push()
        print("Tag pushed to origin")
    except OSError:
        os.system(f"git push --atomic origin main {tag_name}")
    

def generate_changelog(VERSION: str):
    print(f"Generating changelog for VERSION {VERSION}")
    os.system(f"git-chglog --next-tag v{VERSION} --output CHANGELOG.md")


def update_package(VERSION: str):
    with open("package.json", "r") as f:
        package = json.load(f)
    package["version"] = VERSION
    with open("package.json", "w") as f:
        json.dump(package, f, indent=4)
    print("Package.json updated")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("VERSION", help="Version to create tag for")
    args = parser.parse_args()
    generate_changelog(args.VERSION)
    update_package(args.VERSION)
    create_tag(args.VERSION)
