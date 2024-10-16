from website import create_app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True)

# app.run is going to run flask api and start webserver.
# debug=true means if change python code it's going to auto
# rerun the webserver
